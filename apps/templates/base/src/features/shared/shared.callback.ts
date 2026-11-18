import type { BotCallbackContext } from "@/core"

export async function sharedCloseCallback(ctx: BotCallbackContext) {
  await ctx.answerCallbackQuery()
  await ctx.deleteMessage().catch(() => ctx.editMessageReplyMarkup())
}
