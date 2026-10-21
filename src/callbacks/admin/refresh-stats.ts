import { type Context, InlineKeyboard } from "grammy";
import { getUptime } from "@/commands/admin/stats";
import { logger } from "@/lib/logger";

export async function refreshStatsCallback(ctx: Context): Promise<void> {
  logger.info("CallbackHandler", "Refreshing /stats via callback", {
    userId: ctx.from?.id,
  });

  const stats = {
    uptime: getUptime(),
    memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(3)} MB`,
  };

  const statsMessage =
    `🤖 *Bot Statistics*\n\n` +
    `⏱️ *Uptime:* ${stats.uptime}\n` +
    `💾 *Memory Usage:* ${stats.memoryUsage}\n` +
    `🔄 *Updated:* \`${new Date().toLocaleTimeString()}\``;

  const keyboard = new InlineKeyboard().text(
    "🔄 Refresh",
    "admin:refresh_stats",
  );

  try {
    await ctx.editMessageText(statsMessage, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery({ text: "✅ Stats updated!" });
  } catch {
    // Telegram throws 400 if the message content hasn't changed (e.g. clicked within the same second)
    await ctx.answerCallbackQuery({ text: "⚡ Stats are already up to date." });
  }
}
