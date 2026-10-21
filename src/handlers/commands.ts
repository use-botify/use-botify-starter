import { Bot, Context, InlineKeyboard } from "grammY";
import { logger } from "@/lib/logger";
import type { CommandHandler } from "@/types/handlers";
import { prisma } from "@/lib/db";
import { getBotStats } from "@/lib/stats";

export const commands: CommandHandler[] = [
  {
    command: "start",
    description: "Start the bot",
    handler: async (ctx) => {
      if (!ctx.from) return;

      logger.info("BotInit", "Received /start command", {
        userId: ctx.from.id,
      });

      const telegramId = BigInt(ctx.from.id);
      const username = ctx.from.username ?? null;
      const firstName = ctx.from.first_name;

      await prisma.user.upsert({
        where: { id: telegramId },
        update: { username, firstName },
        create: { id: telegramId, username, firstName },
      });

      await ctx.reply("Bot is running and ready to boost channels!");
    },
    isPublic: true,
  },
  {
    command: "menu",
    description: "Show menu",
    handler: async (ctx) => {
      const menu = new InlineKeyboard()
        .text("Developer", "menu:dev")
        .text("Admin", "menu:admin")
        .row()
        .text("Help", "menu:help");
      await ctx.reply("Choose an option:", { reply_markup: menu });
    },
    isPublic: true,
  },
  {
    command: "stats",
    description: "Check bot statistics",
    handler: async (ctx) => {
      const stats = getBotStats();
      logger.info("StatsHandler", "Received /stats command");

      const statsMessage =
        `🤖 *Bot Statistics*\n\n` +
        `⏱️ *Uptime:* ${stats.uptime}\n` +
        `💾 *Memory Usage:* ${stats.memoryUsage}\n`;

      await ctx.reply(statsMessage, { parse_mode: "Markdown" });
    },
    isPublic: false,
  },
];

export function registerCommands(bot: Bot<Context>) {
  commands.forEach((cmd) => {
    bot.command(cmd.command, cmd.handler);
  });
}
