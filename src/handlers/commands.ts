import type { Bot, Context } from "grammy";
import type { BotCommand } from "grammy/types";
import { broadcastCommand, statsCommand } from "@/commands/admin";
import { startCommand } from "@/commands/public";
import { isAdmin } from "@/middlewares/is-admin";

export const publicCommandsMenu: BotCommand[] = [
  { command: "start", description: "Start the bot" },
];

export const adminCommandsMenu: BotCommand[] = [
  ...publicCommandsMenu,
  { command: "stats", description: "View bot statistics (Admin)" },
  { command: "broadcast", description: "Broadcast a message (Admin)" },
];

export function registerPublicCommands(bot: Bot<Context>): void {
  bot.command("start", startCommand);
}

export function registerAdminCommands(bot: Bot<Context>): void {
  bot.command("stats", isAdmin, statsCommand);
  bot.command("broadcast", isAdmin, broadcastCommand);
}
