import { randomUUID } from "node:crypto"

import { getErrorMessage } from "@workspace/utils"
import { type Context, GrammyError, HttpError } from "grammy"

import { resolveLogger } from "../lib/logger"
import type {
  CoreErrorHandler,
  ErrorHandlerMeta,
  ErrorHandlerOptions,
} from "../types/middleware.types"

const DEFAULT_BENIGN_400: readonly string[] = [
  "message is not modified",
  "query is too old",
  "message to edit not found",
  "message to delete not found",
]

const defaultFallbackMessage = (errorId: string): string =>
  `⚠️ Something went wrong. Please try again later.\nReference: ${errorId}`

async function dismissCallback(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery) {
    return
  }

  await ctx.answerCallbackQuery().catch(() => undefined)
}

export function createErrorHandler<C extends Context = Context>(
  options: ErrorHandlerOptions<C> = {}
): CoreErrorHandler<C> {
  const logger = resolveLogger(options.logger)
  const benignErrors = options.benignErrors ?? DEFAULT_BENIGN_400
  const generateErrorId =
    options.generateErrorId ?? (() => randomUUID().slice(0, 8))

  return async (err) => {
    const { ctx, error } = err
    const errorId = generateErrorId()

    const meta: ErrorHandlerMeta = {
      errorId,
      updateId: ctx.update.update_id,
      updateType: Object.keys(ctx.update).find((key) => key !== "update_id"),
      callbackData: ctx.callbackQuery?.data,
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
      chatType: ctx.chat?.type,
    }

    if (error instanceof GrammyError) {
      if (error.error_code === 403) {
        logger.info("TelegramBlocked", error.description, meta)
        if (options.onUserBlocked) {
          try {
            await options.onUserBlocked(ctx, error)
          } catch (hookError: unknown) {
            logger.warn("ErrorHandler", "onUserBlocked hook failed", {
              ...meta,
              error: getErrorMessage(hookError),
            })
          }
        }
        return
      }

      if (error.error_code === 429) {
        const retryAfter = error.parameters?.retry_after
        logger.warn("TelegramFloodWait", "Rate limited by Telegram", {
          ...meta,
          retryAfter,
        })
        if (options.onFloodWait) {
          try {
            await options.onFloodWait(ctx, error, retryAfter)
          } catch (hookError: unknown) {
            logger.warn("ErrorHandler", "onFloodWait hook failed", {
              ...meta,
              error: getErrorMessage(hookError),
            })
          }
        }
        await dismissCallback(ctx)
        return
      }

      if (
        error.error_code === 400 &&
        benignErrors.some((pattern) => error.description.includes(pattern))
      ) {
        logger.info("TelegramBenign", error.description, meta)
        await dismissCallback(ctx)
        return
      }

      logger.error(
        "GrammyError",
        `[${error.error_code}] ${error.description}`,
        {
          ...meta,
          method: error.method,
        }
      )
    } else if (error instanceof HttpError) {
      logger.error("HttpError", "Could not reach Telegram", {
        ...meta,
        error: getErrorMessage(error),
      })
      return
    } else {
      logger.error("UnhandledBotError", "Error in middleware or handler", {
        ...meta,
        error: getErrorMessage(error),
      })
    }

    if (options.onError) {
      try {
        await options.onError(err, meta)
      } catch (hookError: unknown) {
        logger.warn("ErrorHandler", "onError hook failed", {
          ...meta,
          error: getErrorMessage(hookError),
        })
      }
    }

    const message =
      typeof options.fallbackMessage === "function"
        ? options.fallbackMessage(errorId, err)
        : (options.fallbackMessage ?? defaultFallbackMessage(errorId))

    if (ctx.callbackQuery) {
      await ctx
        .answerCallbackQuery({
          text: message,
          show_alert: true,
        })
        .catch((replyErr: unknown) => {
          logger.warn("ErrorHandler", "Fallback callback alert failed", {
            ...meta,
            error: getErrorMessage(replyErr),
          })
        })
      return
    }

    if (!ctx.chat) {
      return
    }

    await ctx.reply(message).catch((replyErr: unknown) => {
      logger.warn("ErrorHandler", "Fallback reply failed", {
        ...meta,
        error: getErrorMessage(replyErr),
      })
    })
  }
}
