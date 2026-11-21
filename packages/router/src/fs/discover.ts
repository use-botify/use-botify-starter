import { readdir, stat } from "node:fs/promises"
import path from "node:path"

import { getErrorMessage } from "@workspace/utils"

import { BotifyRouterError } from "../lib/errors"
import { ROUTE_SEPARATOR } from "../lib/route"
import type { DefaultAccess } from "../types/feature.types"
import type {
  DiscoveredRouteFile,
  DiscoveredRouteKind,
  DiscoverRoutesOptions,
} from "../types/fs.types"

export const DEFAULT_ROUTE_EXTENSIONS = [".ts", ".mts", ".js", ".mjs"] as const

const ROUTE_GROUP_PATTERN = /^\(([a-z][a-z0-9_]*)\)$/
const DYNAMIC_SEGMENT_PATTERN = /^\[([A-Za-z_][A-Za-z0-9_]*)\]$/
const IGNORED_DIRECTORIES = new Set(["node_modules", "dist", "build"])
const TEST_FILE_PATTERN = /\.(test|spec)\.[^.]+$/
const DECLARATION_FILE_PATTERN = /\.d\.[cm]?ts$/

interface ParsedFileKind {
  readonly kind: DiscoveredRouteKind
  readonly stem: string | undefined
}

function normalizeIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function stripExtension(
  fileName: string,
  extensions: readonly string[]
): string | undefined {
  if (
    DECLARATION_FILE_PATTERN.test(fileName) ||
    TEST_FILE_PATTERN.test(fileName)
  ) {
    return undefined
  }

  for (const ext of extensions) {
    if (fileName.endsWith(ext)) {
      return fileName.slice(0, -ext.length)
    }
  }

  return undefined
}

function parseRouteFileKind(baseName: string): ParsedFileKind | undefined {
  if (baseName === "command") {
    return { kind: "command", stem: undefined }
  }
  if (baseName.endsWith(".command")) {
    return { kind: "command", stem: baseName.slice(0, -".command".length) }
  }

  if (baseName === "callback") {
    return { kind: "callback", stem: undefined }
  }
  if (baseName.endsWith(".callback")) {
    return { kind: "callback", stem: baseName.slice(0, -".callback".length) }
  }

  if (baseName === "feature") {
    return { kind: "feature", stem: undefined }
  }
  if (baseName.endsWith(".feature")) {
    return { kind: "feature", stem: baseName.slice(0, -".feature".length) }
  }

  return undefined
}

function inferFeatureName(
  routeSegments: readonly string[],
  stem: string | undefined,
  relativePath: string
): string {
  const firstLiteral = routeSegments.find(
    (segment) => !DYNAMIC_SEGMENT_PATTERN.test(segment)
  )

  const candidate = firstLiteral ?? stem
  const normalized = candidate ? normalizeIdentifier(candidate) : ""

  if (!normalized) {
    throw new BotifyRouterError(
      "ROUTE_DISCOVERY_ERROR",
      `Could not infer a valid feature name for "${relativePath}". Place route files inside a named folder under features/.`
    )
  }

  return normalized
}

function inferCommandName(
  routeSegments: readonly string[],
  stem: string | undefined,
  relativePath: string
): string {
  const lastLiteral = [...routeSegments]
    .reverse()
    .find((segment) => !DYNAMIC_SEGMENT_PATTERN.test(segment))

  const candidate = stem ?? lastLiteral
  const normalized = candidate ? normalizeIdentifier(candidate) : ""

  if (!normalized) {
    throw new BotifyRouterError(
      "ROUTE_DISCOVERY_ERROR",
      `Could not infer a command name for "${relativePath}".`
    )
  }

  return normalized
}

function inferCallbackPattern(
  featureName: string,
  routeSegments: readonly string[],
  stem: string | undefined
): string {
  const segments = [...routeSegments]

  if (segments.length === 0) {
    segments.push(featureName)
  } else if (
    segments[0] &&
    !DYNAMIC_SEGMENT_PATTERN.test(segments[0]) &&
    normalizeIdentifier(segments[0]) === featureName
  ) {
    segments[0] = featureName
  } else {
    segments.unshift(featureName)
  }

  if (stem) {
    const last = segments.at(-1)
    if (last !== stem) {
      segments.push(stem)
    }
  }

  if (segments.length === 1) {
    segments.push("callback")
  }

  return segments.join(ROUTE_SEPARATOR)
}

async function assertDirectoryExists(dirPath: string): Promise<void> {
  try {
    const info = await stat(dirPath)
    if (!info.isDirectory()) {
      throw new BotifyRouterError(
        "ROUTE_DISCOVERY_ERROR",
        `Features path "${dirPath}" is not a directory.`
      )
    }
  } catch (error: unknown) {
    if (error instanceof BotifyRouterError) {
      throw error
    }

    throw new BotifyRouterError(
      "ROUTE_DISCOVERY_ERROR",
      `Could not access features directory "${dirPath}": ${getErrorMessage(error)}`,
      { cause: error }
    )
  }
}

/**
 * Recursively scans a Next.js-style `features/` directory and returns
 * deterministically ordered route file descriptors.
 */
export async function discoverRoutes<TAccess extends string = DefaultAccess>(
  options: DiscoverRoutesOptions<TAccess>
): Promise<readonly DiscoveredRouteFile<TAccess>[]> {
  const rootDir = path.resolve(options.featuresDir)
  const defaultAccess = (options.defaultAccess ?? "public") as TAccess
  const extensions = options.extensions ?? DEFAULT_ROUTE_EXTENSIONS

  await assertDirectoryExists(rootDir)

  const discovered: DiscoveredRouteFile<TAccess>[] = []

  const walk = async (
    currentDir: string,
    routeSegments: readonly string[],
    currentAccess: TAccess
  ): Promise<void> => {
    const entries = await readdir(currentDir, { withFileTypes: true })
    const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of sorted) {
      if (entry.name.startsWith(".") || entry.name.startsWith("_")) {
        continue
      }

      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue
        }

        const groupMatch = ROUTE_GROUP_PATTERN.exec(entry.name)
        if (groupMatch?.[1]) {
          await walk(fullPath, routeSegments, groupMatch[1] as TAccess)
          continue
        }

        await walk(fullPath, [...routeSegments, entry.name], currentAccess)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const baseName = stripExtension(entry.name, extensions)
      if (!baseName) {
        continue
      }

      const parsed = parseRouteFileKind(baseName)
      if (!parsed) {
        continue
      }

      const relativePath = path
        .relative(rootDir, fullPath)
        .replaceAll("\\", "/")

      const featureName = inferFeatureName(
        routeSegments,
        parsed.stem,
        relativePath
      )

      if (parsed.kind === "command") {
        discovered.push(
          Object.freeze<DiscoveredRouteFile<TAccess>>({
            kind: "command",
            filePath: fullPath,
            relativePath,
            featureName,
            access: currentAccess,
            commandName: inferCommandName(
              routeSegments,
              parsed.stem,
              relativePath
            ),
          })
        )
        continue
      }

      if (parsed.kind === "callback") {
        discovered.push(
          Object.freeze<DiscoveredRouteFile<TAccess>>({
            kind: "callback",
            filePath: fullPath,
            relativePath,
            featureName,
            access: currentAccess,
            callbackPattern: inferCallbackPattern(
              featureName,
              routeSegments,
              parsed.stem
            ),
          })
        )
        continue
      }

      discovered.push(
        Object.freeze<DiscoveredRouteFile<TAccess>>({
          kind: "feature",
          filePath: fullPath,
          relativePath,
          featureName,
          access: currentAccess,
        })
      )
    }
  }

  await walk(rootDir, [], defaultAccess)

  return Object.freeze(discovered)
}
