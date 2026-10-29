const MAX_CALLBACK_BYTES = 64;

const SEPARATOR = ":";
const PARAM_SEGMENT = /^\{([A-Za-z_][A-Za-z0-9_]*)\}$/;
const LITERAL_SEGMENT = /^[A-Za-z0-9_.-]+$/;
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

export type RouteSegment =
  | { kind: "literal"; value: string }
  | { kind: "param"; name: string };

type SegmentParam<S extends string> = S extends `{${infer Name}}`
  ? Name
  : never;

type ParamNames<P extends string> = P extends `${infer Head}:${infer Tail}`
  ? SegmentParam<Head> | ParamNames<Tail>
  : SegmentParam<P>;

export type CallbackParams<P extends string> = {
  [K in ParamNames<P>]: string;
};

type CallbackInput<P extends string> = {
  [K in ParamNames<P>]: string | number;
};

type BuildArgs<P extends string> = [ParamNames<P>] extends [never]
  ? []
  : [params: CallbackInput<P>];

export type RouteInfo = {
  readonly pattern: string;
  readonly segments: readonly RouteSegment[];
  readonly regex: RegExp;
  match: (data: string) => Record<string, string> | null;
};

export type CallbackRoute<P extends string = string> = RouteInfo & {
  readonly pattern: P;
  build: (...args: BuildArgs<P>) => string;
};

const escapeRegExp = (value: string): string =>
  value.replace(REGEX_SPECIALS, "\\$&");

function parseSegments(pattern: string): RouteSegment[] {
  const segments = pattern.split(SEPARATOR).map((raw): RouteSegment => {
    const name = PARAM_SEGMENT.exec(raw)?.[1];
    if (name) return { kind: "param", name };
    if (LITERAL_SEGMENT.test(raw)) return { kind: "literal", value: raw };

    throw new Error(
      `Invalid callback route "${pattern}": segment "${raw}" must be a literal (letters, digits, "_", "-", ".") or a {param}.`,
    );
  });

  const names = segments.flatMap((segment) =>
    segment.kind === "param" ? [segment.name] : [],
  );
  if (new Set(names).size !== names.length) {
    throw new Error(
      `Invalid callback route "${pattern}": param names must be unique.`,
    );
  }

  return segments;
}

function minimumByteLength(segments: readonly RouteSegment[]): number {
  const content = segments.reduce(
    (sum, segment) =>
      sum + (segment.kind === "literal" ? Buffer.byteLength(segment.value) : 1),
    0,
  );
  return content + (segments.length - 1);
}

function compileRegex(segments: readonly RouteSegment[]): RegExp {
  const source = segments
    .map((segment) =>
      segment.kind === "literal"
        ? escapeRegExp(segment.value)
        : `(?<${segment.name}>[^${SEPARATOR}]+)`,
    )
    .join(SEPARATOR);

  return new RegExp(`^${source}$`);
}

function buildData(
  pattern: string,
  segments: readonly RouteSegment[],
  params: Record<string, string | number>,
): string {
  const data = segments
    .map((segment) => {
      if (segment.kind === "literal") return segment.value;

      const value = String(params[segment.name] ?? "");
      if (value === "" || value.includes(SEPARATOR)) {
        throw new Error(
          `Callback route "${pattern}": param "${segment.name}" must be non-empty and must not contain "${SEPARATOR}" (got "${value}").`,
        );
      }
      return value;
    })
    .join(SEPARATOR);

  const bytes = Buffer.byteLength(data);
  if (bytes > MAX_CALLBACK_BYTES) {
    throw new Error(
      `Callback route "${pattern}": built data "${data}" is ${bytes} bytes, Telegram allows at most ${MAX_CALLBACK_BYTES}.`,
    );
  }

  return data;
}

export function defineCallbackRoute<P extends string>(
  pattern: P,
): CallbackRoute<P> {
  const segments = parseSegments(pattern);

  const minimumBytes = minimumByteLength(segments);
  if (minimumBytes > MAX_CALLBACK_BYTES) {
    throw new Error(
      `Invalid callback route "${pattern}": even with 1-byte params it needs ${minimumBytes} bytes, Telegram allows at most ${MAX_CALLBACK_BYTES}.`,
    );
  }

  const regex = compileRegex(segments);

  return {
    pattern,
    segments,
    regex,
    match: (data) => {
      const found = regex.exec(data);
      return found ? { ...found.groups } : null;
    },
    build: ((params: Record<string, string | number> = {}) =>
      buildData(
        pattern,
        segments,
        params,
      )) as unknown as CallbackRoute<P>["build"],
  };
}
