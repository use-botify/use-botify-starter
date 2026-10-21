import type { Context } from "grammy";
import { buildStatsMessage } from "@/commands/admin";
import { logger } from "@/lib/logger";

export async function refreshStatsCallback(ctx: Context): Promise<void> {
  logger.info("CallbackHandler", "Refreshing /stats via callback", {
    userId: ctx.from?.id,
  });

  const { text, keyboard } = await buildStatsMessage(true);

  try {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery({ text: "✅ Stats updated!" });
  } catch {
    await ctx.answerCallbackQuery({ text: "⚡ Stats are already up to date." });
  }
}
