import type { Bot, Context } from "grammy";
import type { BotCommand } from "grammy/types";
import { adminCommand, broadcastCommand, statsCommand } from "@/commands/admin";
import { helpCommand, startCommand } from "@/commands/public";
import { isAdmin } from "@/middlewares/is-admin";

export const publicCommandsMenu: BotCommand[] = [
  { command: "start", description: "Start the bot" },
  { command: "help", description: "View help and available commands" },
];

export const adminCommandsMenu: BotCommand[] = [
  ...publicCommandsMenu,
  { command: "admin", description: "Open Admin Control Panel (Admin)" },
  { command: "stats", description: "View bot statistics (Admin)" },
  { command: "broadcast", description: "Broadcast a message (Admin)" },
];

export function registerPublicCommands(bot: Bot<Context>): void {
  bot.command("start", startCommand);
  bot.command("help", helpCommand);
}

export function registerAdminCommands(bot: Bot<Context>): void {
  bot.command("admin", isAdmin, adminCommand);
  bot.command("stats", isAdmin, statsCommand);
  bot.command("broadcast", isAdmin, broadcastCommand);
}
