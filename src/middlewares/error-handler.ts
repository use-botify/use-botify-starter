import { type BotError, type Context, GrammyError, HttpError } from "grammy";
import { logger } from "@/lib/logger";

export async function errorHandler(err: BotError<Context>): Promise<void> {
  const ctx = err.ctx;
  const e = err.error;

  const updateMeta = {
    updateId: ctx.update.update_id,
    userId: ctx.from?.id,
    chatId: ctx.chat?.id,
    text: ctx.message?.text,
  };

  if (e instanceof GrammyError) {
    logger.error(
      "GrammyError",
      `Telegram API Error [${e.error_code}]: ${e.description}`,
      {
        ...updateMeta,
        method: e.method,
      },
    );
  } else if (e instanceof HttpError) {
    logger.error("HttpError", "Could not contact Telegram servers:", {
      ...updateMeta,
      error: e,
    });
  } else {
    logger.error(
      "UnhandledBotError",
      "Unexpected error in middleware/handler:",
      {
        ...updateMeta,
        error: e,
      },
    );
  }

  // Attempt to notify the user unless the bot was blocked (403) or chat not found (400)
  if (
    ctx.chat &&
    !(
      e instanceof GrammyError &&
      (e.error_code === 403 || e.error_code === 400)
    )
  ) {
    try {
      await ctx.reply(
        "⚠️ Something went wrong while processing your request. Please try again later.",
      );
    } catch (replyErr) {
      logger.error(
        "ErrorHandler",
        "Failed to send error fallback message:",
        replyErr,
      );
    }
  }
}
