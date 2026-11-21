export type RouterErrorCode =
  | "INVALID_ROUTE_PATTERN"
  | "INVALID_ROUTE_PARAMS"
  | "CALLBACK_TOO_LONG"
  | "INVALID_FEATURE_CONFIG"
  | "UNKNOWN_ACCESS_TIER"
  | "ROUTE_DISCOVERY_ERROR"

export type RouteSegment =
  | { readonly kind: "literal"; readonly value: string }
  | { readonly kind: "param"; readonly name: string }

type SegmentParam<S extends string> = S extends `{${infer Name}}`
  ? Name
  : S extends `[${infer Name}]`
    ? Name
    : never

export type RouteParamNames<P extends string> =
  P extends `${infer Head}:${infer Tail}`
    ? SegmentParam<Head> | RouteParamNames<Tail>
    : SegmentParam<P>

export type CallbackParams<P extends string> = {
  readonly [K in RouteParamNames<P>]: string
}

export type CallbackParamInput<P extends string> = {
  readonly [K in RouteParamNames<P>]: string | number
}

export type CallbackBuildArgs<P extends string> = [RouteParamNames<P>] extends [
  never,
]
  ? []
  : [params: CallbackParamInput<P>]

export interface RouteInfo {
  readonly pattern: string
  readonly segments: readonly RouteSegment[]
  readonly paramNames: readonly string[]
  readonly isDynamic: boolean
  readonly regex: RegExp
  readonly match: (data: string) => Readonly<Record<string, string>> | null
}

export type CallbackRoute<P extends string = string> = Omit<
  RouteInfo,
  "pattern" | "match"
> & {
  readonly pattern: P
  readonly match: (data: string) => CallbackParams<P> | null
  readonly build: (...args: CallbackBuildArgs<P>) => string
}
