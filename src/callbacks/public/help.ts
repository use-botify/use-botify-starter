import type { Context } from "grammy";
import { buildHelpMessage } from "@/commands/public/help";
import { logger } from "@/lib/logger";

export async function helpCallback(ctx: Context): Promise<void> {
  logger.info("CallbackHandler", "Executing public:help callback", {
    userId: ctx.from?.id,
  });

  const { text, keyboard } = buildHelpMessage(ctx.from?.id);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}
