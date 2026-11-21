import type { CallbackQueryContext, Context } from "grammy"

import type { CloseMessageOptions } from "../types/panel.types"

/**
 * Answers a close-button callback and deletes the message, falling back to
 * clearing its inline keyboard if Telegram refuses deletion.
 */
export async function closeMessageCallback<C extends Context = Context>(
  ctx: CallbackQueryContext<C>,
  options: CloseMessageOptions = {}
): Promise<void> {
  const answerPayload = options.answerText
    ? { text: options.answerText }
    : undefined

  await ctx.answerCallbackQuery(answerPayload).catch(() => undefined)

  try {
    await ctx.deleteMessage()
  } catch {
    if (options.fallbackClearMarkup !== false) {
      await ctx.editMessageReplyMarkup().catch(() => undefined)
    }
  }
}

/**
 * Factory returning a reusable grammY callback handler with preset close options.
 */
export function createCloseMessageCallback<C extends Context = Context>(
  options: CloseMessageOptions = {}
): (ctx: CallbackQueryContext<C>) => Promise<void> {
  return (ctx) => closeMessageCallback(ctx, options)
}
