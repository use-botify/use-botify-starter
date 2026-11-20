import type { Context, MiddlewareFn } from "grammy"

import { BotifyCoreError } from "../lib/errors"
import { resolveLogger } from "../lib/logger"
import type {
  RateLimiterMiddleware,
  RateLimiterOptions,
  RateLimitInfo,
} from "../types/middleware.types"

interface BucketState {
  timestamps: number[]
  warned: boolean
}

const DEFAULT_INTERVAL_WINDOW_MS = 3_000
const DEFAULT_MAX_REQUESTS = 3
const DEFAULT_CLEANUP_INTERVAL_MS = 60_000
const DEFAULT_CALLBACK_MESSAGE = "⏳ Too many requests! Please slow down."
const DEFAULT_REPLY_MESSAGE =
  "⏳ You are sending requests too fast. Please wait a moment."

function assertPositiveSafeInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new BotifyCoreError(
      "INVALID_CONFIG",
      `${name} must be a positive safe integer (received ${String(value)}).`
    )
  }
}

export function rateLimiter<C extends Context = Context>(
  options: RateLimiterOptions<C> = {}
): RateLimiterMiddleware<C> {
  const intervalWindowMs =
    options.intervalWindowMs ?? DEFAULT_INTERVAL_WINDOW_MS
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS
  const cleanupIntervalMs =
    options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS

  assertPositiveSafeInteger("intervalWindowMs", intervalWindowMs)
  assertPositiveSafeInteger("maxRequests", maxRequests)
  assertPositiveSafeInteger("cleanupIntervalMs", cleanupIntervalMs)

  const logger = resolveLogger(options.logger)
  const now = options.now ?? Date.now
  const callbackMessage = options.callbackMessage ?? DEFAULT_CALLBACK_MESSAGE
  const replyMessage = options.replyMessage ?? DEFAULT_REPLY_MESSAGE
  const buckets = new Map<string, BucketState>()

  const prune = (state: BucketState, currentTime: number): void => {
    while (
      state.timestamps[0] !== undefined &&
      currentTime - state.timestamps[0] >= intervalWindowMs
    ) {
      state.timestamps.shift()
    }
  }

  const cleanupTimer = setInterval(() => {
    const currentTime = now()

    for (const [key, state] of buckets) {
      prune(state, currentTime)
      if (state.timestamps.length === 0) {
        buckets.delete(key)
      }
    }
  }, cleanupIntervalMs)
  cleanupTimer.unref()

  const middleware: MiddlewareFn<C> = async (ctx, next) => {
    if (ctx.myChatMember || options.skip?.(ctx)) {
      await next()
      return
    }

    const rawKey = options.keyGenerator
      ? options.keyGenerator(ctx)
      : ctx.from?.id

    if (rawKey === undefined || rawKey === "") {
      await next()
      return
    }

    const key = String(rawKey)
    const currentTime = now()
    let state = buckets.get(key)

    if (!state) {
      state = { timestamps: [], warned: false }
      buckets.set(key, state)
    }

    prune(state, currentTime)

    if (state.timestamps.length < maxRequests) {
      state.timestamps.push(currentTime)
      state.warned = false
      await next()
      return
    }

    const firstBlock = !state.warned
    state.warned = true

    const info: RateLimitInfo = {
      key,
      requestsInWindow: state.timestamps.length,
      maxRequests,
      intervalWindowMs,
      firstBlock,
    }

    if (firstBlock) {
      logger.warn("RateLimit", "User exceeded rate limit", {
        key,
        userId: ctx.from?.id,
        username: ctx.from?.username ?? null,
        requestsInWindow: info.requestsInWindow,
      })
    }

    if (options.onLimitExceeded) {
      await options.onLimitExceeded(ctx, info)
      return
    }

    if (ctx.callbackQuery) {
      await ctx
        .answerCallbackQuery(firstBlock ? { text: callbackMessage } : undefined)
        .catch(() => undefined)
      return
    }

    if (firstBlock) {
      await ctx.reply(replyMessage).catch(() => undefined)
    }
  }

  return Object.assign(middleware, {
    dispose(): void {
      clearInterval(cleanupTimer)
      buckets.clear()
    },
    clear(): void {
      buckets.clear()
    },
  })
}
