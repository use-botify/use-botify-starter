import type { Context } from "grammy";
import { ADMIN_CALLBACKS, TypedInlineKeyboard } from "@/lib/callbacks";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const startTime = Date.now();

export async function buildStatsMessage(includeTimestamp = false): Promise<{
  text: string;
  keyboard: TypedInlineKeyboard;
}> {
  const [
    totalUsers,
    activeUsers,
    totalGroups,
    activeGroups,
    totalChannels,
    activeChannels,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.chat.count({ where: { type: { in: ["group", "supergroup"] } } }),
    db.chat.count({
      where: { type: { in: ["group", "supergroup"] }, isActive: true },
    }),
    db.chat.count({ where: { type: "channel" } }),
    db.chat.count({ where: { type: "channel", isActive: true } }),
  ]);

  const blockedUsers = totalUsers - activeUsers;
  const inactiveGroups = totalGroups - activeGroups;
  const inactiveChannels = totalChannels - activeChannels;
  const memoryUsage = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;

  let text =
    `🤖 *Bot Statistics*\n\n` +
    `👥 *Users*\n` +
    `• Total: \`${totalUsers}\` (✅ Active: \`${activeUsers}\` | 🚫 Blocked: \`${blockedUsers}\`)\n\n` +
    `💬 *Groups*\n` +
    `• Total: \`${totalGroups}\` (✅ Active: \`${activeGroups}\` | ❌ Left: \`${inactiveGroups}\`)\n\n` +
    `📢 *Channels*\n` +
    `• Total: \`${totalChannels}\` (✅ Active: \`${activeChannels}\` | ❌ Left: \`${inactiveChannels}\`)\n\n` +
    `⚙️ *System*\n` +
    `• ⏱️ Uptime: \`${getUptime()}\`\n` +
    `• 💾 Memory: \`${memoryUsage}\``;

  if (includeTimestamp) {
    text += `\n• 🔄 Updated: \`${new Date().toLocaleTimeString()}\``;
  }

  const keyboard = new TypedInlineKeyboard().text(
    "🔄 Refresh",
    ADMIN_CALLBACKS.REFRESH_STATS,
  );

  return { text, keyboard };
}

export async function statsCommand(ctx: Context): Promise<void> {
  logger.info("StatsHandler", "Executing /stats", { userId: ctx.from?.id });

  const { text, keyboard } = await buildStatsMessage(false);

  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

export function getUptime(): string {
  const uptimeMs = Date.now() - startTime;
  const seconds = Math.floor((uptimeMs / 1000) % 60);
  const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
  const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
