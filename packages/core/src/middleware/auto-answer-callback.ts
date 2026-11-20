import { getErrorMessage } from "@workspace/utils"
import { type Context, GrammyError, type MiddlewareFn } from "grammy"

import { resolveLogger } from "../lib/logger"
import type { AutoAnswerCallbackOptions } from "../types/middleware.types"

const DEFAULT_EXPIRED_PATTERNS: readonly string[] = [
  "query is too old",
  "query ID is invalid",
]

function isExpiredCallbackError(
  error: unknown,
  patterns: readonly string[]
): boolean {
  return (
    error instanceof GrammyError &&
    error.error_code === 400 &&
    patterns.some((pattern) => error.description.includes(pattern))
  )
}

export function autoAnswerCallback<C extends Context = Context>(
  options: AutoAnswerCallbackOptions = {}
): MiddlewareFn<C> {
  const logger = resolveLogger(options.logger)
  const expiredPatterns =
    options.expiredErrorPatterns ?? DEFAULT_EXPIRED_PATTERNS

  return async (ctx, next) => {
    if (!ctx.callbackQuery) {
      await next()
      return
    }

    let answered = false

    ctx.api.config.use(async (prev, method, payload, signal) => {
      if (method !== "answerCallbackQuery") {
        return prev(method, payload, signal)
      }

      if (answered) {
        return { ok: true, result: true } as Awaited<ReturnType<typeof prev>>
      }

      answered = true

      try {
        return await prev(method, payload, signal)
      } catch (error: unknown) {
        if (isExpiredCallbackError(error, expiredPatterns)) {
          logger.debug("CallbackGuard", "Ignored expired callback query", {
            callbackData: ctx.callbackQuery?.data,
            userId: ctx.from?.id,
          })
          return { ok: true, result: true } as Awaited<ReturnType<typeof prev>>
        }

        answered = false
        throw error
      }
    })

    try {
      await next()
    } finally {
      if (!answered) {
        await ctx.answerCallbackQuery().catch((error: unknown) => {
          logger.debug("CallbackGuard", "Fallback callback answer failed", {
            error: getErrorMessage(error),
            userId: ctx.from?.id,
          })
        })
      }
    }
  }
}
