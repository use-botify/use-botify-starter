import type {
  CallbackParams,
  CallbackRoute,
  RouteInfo,
  RouteSegment,
} from "../types/route.types"
import { BotifyRouterError } from "./errors"

export const MAX_CALLBACK_BYTES = 64
export const ROUTE_SEPARATOR = ":"

const BRACE_PARAM_SEGMENT = /^\{([A-Za-z_][A-Za-z0-9_]*)\}$/
const BRACKET_PARAM_SEGMENT = /^\[([A-Za-z_][A-Za-z0-9_]*)\]$/
const LITERAL_SEGMENT = /^[A-Za-z0-9_.-]+$/
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g

const utf8Encoder = new TextEncoder()

function getUtf8ByteLength(value: string): number {
  return utf8Encoder.encode(value).byteLength
}

function escapeRegExp(value: string): string {
  return value.replace(REGEX_SPECIALS, "\\$&")
}

function extractParamName(raw: string): string | undefined {
  return (
    BRACE_PARAM_SEGMENT.exec(raw)?.[1] ?? BRACKET_PARAM_SEGMENT.exec(raw)?.[1]
  )
}

export function parseRouteSegments(pattern: string): readonly RouteSegment[] {
  if (pattern.length === 0) {
    throw new BotifyRouterError(
      "INVALID_ROUTE_PATTERN",
      "Callback route pattern cannot be empty."
    )
  }

  const segments = pattern.split(ROUTE_SEPARATOR).map((raw): RouteSegment => {
    const paramName = extractParamName(raw)
    if (paramName) {
      return Object.freeze({ kind: "param", name: paramName })
    }

    if (LITERAL_SEGMENT.test(raw)) {
      return Object.freeze({ kind: "literal", value: raw })
    }

    throw new BotifyRouterError(
      "INVALID_ROUTE_PATTERN",
      `Invalid callback route "${pattern}": segment "${raw}" must be a literal (letters, digits, "_", "-", ".") or a {param}/[param] segment.`
    )
  })

  const seenParams = new Set<string>()
  for (const segment of segments) {
    if (segment.kind !== "param") {
      continue
    }

    if (seenParams.has(segment.name)) {
      throw new BotifyRouterError(
        "INVALID_ROUTE_PATTERN",
        `Invalid callback route "${pattern}": duplicate param name "${segment.name}".`
      )
    }

    seenParams.add(segment.name)
  }

  return Object.freeze(segments)
}

function calculateMinimumBytes(segments: readonly RouteSegment[]): number {
  const contentBytes = segments.reduce(
    (sum, segment) =>
      sum + (segment.kind === "literal" ? getUtf8ByteLength(segment.value) : 1),
    0
  )

  return contentBytes + (segments.length - 1)
}

function compileRouteRegex(segments: readonly RouteSegment[]): RegExp {
  const source = segments
    .map((segment) =>
      segment.kind === "literal"
        ? escapeRegExp(segment.value)
        : `(?<${segment.name}>[^${ROUTE_SEPARATOR}]+)`
    )
    .join(ROUTE_SEPARATOR)

  return new RegExp(`^${source}$`)
}

function buildCallbackData(
  pattern: string,
  segments: readonly RouteSegment[],
  params: Record<string, string | number>
): string {
  const data = segments
    .map((segment) => {
      if (segment.kind === "literal") {
        return segment.value
      }

      const raw = params[segment.name]
      if (
        raw === undefined ||
        (typeof raw === "number" && !Number.isFinite(raw))
      ) {
        throw new BotifyRouterError(
          "INVALID_ROUTE_PARAMS",
          `Callback route "${pattern}": missing or non-finite value for param "${segment.name}".`
        )
      }

      const value = String(raw)
      if (value.length === 0 || value.includes(ROUTE_SEPARATOR)) {
        throw new BotifyRouterError(
          "INVALID_ROUTE_PARAMS",
          `Callback route "${pattern}": param "${segment.name}" must be non-empty and must not contain "${ROUTE_SEPARATOR}" (received "${value}").`
        )
      }

      return value
    })
    .join(ROUTE_SEPARATOR)

  const bytes = getUtf8ByteLength(data)
  if (bytes > MAX_CALLBACK_BYTES) {
    throw new BotifyRouterError(
      "CALLBACK_TOO_LONG",
      `Callback route "${pattern}": built data "${data}" is ${bytes} bytes; Telegram allows at most ${MAX_CALLBACK_BYTES}.`
    )
  }

  return data
}

/**
 * Defines a typed callback route supporting both `{param}` and `[param]`
 * dynamic segments, compiled regex matching, and 64-byte payload validation.
 */
export function defineCallbackRoute<const P extends string>(
  pattern: P
): CallbackRoute<P> {
  const segments = parseRouteSegments(pattern)
  const minimumBytes = calculateMinimumBytes(segments)

  if (minimumBytes > MAX_CALLBACK_BYTES) {
    throw new BotifyRouterError(
      "CALLBACK_TOO_LONG",
      `Invalid callback route "${pattern}": requires at least ${minimumBytes} bytes; Telegram allows at most ${MAX_CALLBACK_BYTES}.`
    )
  }

  const paramNames = Object.freeze(
    segments.flatMap((segment) =>
      segment.kind === "param" ? [segment.name] : []
    )
  )
  const regex = compileRouteRegex(segments)

  const match = (data: string): CallbackParams<P> | null => {
    const found = regex.exec(data)
    if (!found) {
      return null
    }

    return Object.freeze({ ...found.groups }) as CallbackParams<P>
  }

  const build = ((params: Record<string, string | number> = {}) =>
    buildCallbackData(
      pattern,
      segments,
      params
    )) as unknown as CallbackRoute<P>["build"]

  return Object.freeze({
    pattern,
    segments,
    paramNames,
    isDynamic: paramNames.length > 0,
    regex,
    match,
    build,
  })
}

/**
 * Checks whether a route begins with `<prefix>:` followed by at least one segment.
 */
export function hasRoutePrefix(
  route: Pick<RouteInfo, "segments">,
  prefix: string
): boolean {
  const [first] = route.segments

  return (
    route.segments.length >= 2 &&
    first?.kind === "literal" &&
    first.value === prefix
  )
}

/**
 * Returns `true` if a single callback_data string could match both routes.
 */
export function routesCollide(
  a: Pick<RouteInfo, "segments">,
  b: Pick<RouteInfo, "segments">
): boolean {
  if (a.segments.length !== b.segments.length) {
    return false
  }

  return a.segments.every((segment, index) => {
    const other = b.segments[index]
    if (!other) {
      return false
    }

    if (segment.kind === "param" || other.kind === "param") {
      return true
    }

    return segment.value === other.value
  })
}

/**
 * Sorts routes from most specific (more literal segments) to least specific
 * so static routes are matched before dynamic ones when registered in order.
 */
export function compareRouteSpecificity(
  a: Pick<RouteInfo, "segments">,
  b: Pick<RouteInfo, "segments">
): number {
  const literalCountA = a.segments.filter((s) => s.kind === "literal").length
  const literalCountB = b.segments.filter((s) => s.kind === "literal").length

  if (literalCountA !== literalCountB) {
    return literalCountB - literalCountA
  }

  return b.segments.length - a.segments.length
}
