import { GrammyError, type Context, type NextFunction } from "grammy"

import { logger } from "@/lib/logger"

const EXPIRED_CALLBACK_ERRORS = ["query is too old", "query ID is invalid"]

const isExpiredCallbackError = (error: unknown): boolean =>
  error instanceof GrammyError &&
  error.error_code === 400 &&
  EXPIRED_CALLBACK_ERRORS.some((text) => error.description.includes(text))

export async function autoAnswerCallback(
  ctx: Context,
  next: NextFunction
): Promise<void> {
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
    } catch (error) {
      if (isExpiredCallbackError(error)) {
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
        logger.debug("CallbackGuard", "Fallback answer failed", {
          error: error instanceof Error ? error.message : String(error),
          userId: ctx.from?.id,
        })
      })
    }
  }
}
