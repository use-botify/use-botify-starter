import { Context, InlineKeyboard } from "grammY";
import { logger } from "@/lib/logger";

const startTime = Date.now();

export async function statsCommand(ctx: Context): Promise<void> {
  logger.info("StatsHandler", "Executing /stats", { userId: ctx.from?.id });
  const stats = {
    uptime: getUptime(),
    memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(3)} MB`,
  };

  const statsMessage =
    `🤖 *Bot Statistics*\n\n` +
    `⏱️ *Uptime:* ${stats.uptime}\n` +
    `💾 *Memory Usage:* ${stats.memoryUsage}\n`;

  const keyboard = new InlineKeyboard().text(
    "🔄 Refresh stats",
    "admin:refresh_stats",
  );

  await ctx.reply(statsMessage, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

export function getUptime(): string {
  const now = Date.now();
  const uptimeMs = now - startTime;

  const seconds = Math.floor((uptimeMs / 1000) % 60);
  const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
  const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
