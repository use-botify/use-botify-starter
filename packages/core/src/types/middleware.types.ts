import type {
  BotError,
  Composer,
  Context,
  ErrorHandler,
  GrammyError,
  Middleware,
  MiddlewareFn,
} from "grammy"

import type { CoreLogger } from "./core.types"

export interface AutoAnswerCallbackOptions {
  /** Custom logger, or `false` to silence debug logs. */
  readonly logger?: CoreLogger | false
  /** Substrings treated as already-expired Telegram 400 callback errors. */
  readonly expiredErrorPatterns?: readonly string[]
}

export type RateLimitInfo = {
  readonly key: string
  readonly requestsInWindow: number
  readonly maxRequests: number
  readonly intervalWindowMs: number
  readonly firstBlock: boolean
}

export interface RateLimiterOptions<C extends Context = Context> {
  /** Sliding window duration in milliseconds. Defaults to `3_000`. */
  readonly intervalWindowMs?: number
  /** Maximum requests allowed within the window. Defaults to `3`. */
  readonly maxRequests?: number
  /** Background stale-state sweep interval in milliseconds. Defaults to `60_000`. */
  readonly cleanupIntervalMs?: number
  /** Return `true` to bypass rate limiting (e.g., admins or system updates). */
  readonly skip?: (ctx: C) => boolean
  /** Derive the rate-limit bucket key. Defaults to `ctx.from?.id`. */
  readonly keyGenerator?: (ctx: C) => string | number | undefined
  /** Custom handler invoked when a request is blocked. */
  readonly onLimitExceeded?: (
    ctx: C,
    info: RateLimitInfo
  ) => void | Promise<void>
  /** Default callback toast when `onLimitExceeded` is not provided. */
  readonly callbackMessage?: string
  /** Default text reply when `onLimitExceeded` is not provided. */
  readonly replyMessage?: string
  /** Custom logger, or `false` to silence warnings. */
  readonly logger?: CoreLogger | false
  /** Clock function for deterministic testing. Defaults to `Date.now`. */
  readonly now?: () => number
}

export type RateLimiterMiddleware<C extends Context = Context> =
  MiddlewareFn<C> & {
    /** Stop the background cleanup timer. */
    readonly dispose: () => void
    /** Clear all tracked rate-limit buckets. */
    readonly clear: () => void
  }

export type ErrorHandlerMeta = {
  readonly errorId: string
  readonly updateId: number
  readonly updateType: string | undefined
  readonly callbackData: string | undefined
  readonly userId: number | undefined
  readonly chatId: number | undefined
  readonly chatType: string | undefined
}

export interface ErrorHandlerOptions<C extends Context = Context> {
  /** Custom logger, or `false` to silence error logs. */
  readonly logger?: CoreLogger | false
  /** Telegram 400 error substrings treated as benign (no user alert sent). */
  readonly benignErrors?: readonly string[]
  /** Fallback message shown to the user on unhandled errors. */
  readonly fallbackMessage?:
    | string
    | ((errorId: string, err: BotError<C>) => string)
  /** Called on Telegram 403 errors (e.g., mark a user inactive in your database). */
  readonly onUserBlocked?: (ctx: C, error: GrammyError) => void | Promise<void>
  /** Called on Telegram 429 flood-wait errors. */
  readonly onFloodWait?: (
    ctx: C,
    error: GrammyError,
    retryAfter: number | undefined
  ) => void | Promise<void>
  /** Called for unexpected errors (Sentry, alerts, metrics, etc.). */
  readonly onError?: (
    err: BotError<C>,
    meta: ErrorHandlerMeta
  ) => void | Promise<void>
  /** Custom reference ID generator. Defaults to an 8-char UUID prefix. */
  readonly generateErrorId?: () => string
}

export type CoreErrorHandler<C extends Context = Context> = ErrorHandler<C>

export interface HmrDispatcherOptions<C extends Context = Context> {
  /** Optional initial middleware mounted before the first hot swap. */
  readonly initial?: Middleware<C>
  /** Custom logger, or `false` to silence HMR debug logs. */
  readonly logger?: CoreLogger | false
  /** Called after every successful middleware swap with the new version number. */
  readonly onReplace?: (version: number) => void
}

export interface HmrDispatcher<C extends Context = Context> {
  /** Stable grammY middleware to mount once via `app.use(hmr.middleware)`. */
  readonly middleware: MiddlewareFn<C>
  /** Monotonically increasing swap counter (`0` before the first swap). */
  readonly version: number
  /** Whether a custom middleware is currently active (vs. pass-through). */
  readonly hasActiveHandler: boolean
  /** Atomically swap the active middleware stack. */
  replace(first: Middleware<C>, ...rest: Middleware<C>[]): number
  /**
   * Build a fresh `Composer<C>` and swap it in only if `configure` succeeds.
   * If `configure` throws, the previous middleware stays active.
   */
  compose(
    configure: (composer: Composer<C>) => void | Promise<void>
  ): Promise<number>
  /** Reset back to a no-op pass-through middleware. */
  reset(): void
}
