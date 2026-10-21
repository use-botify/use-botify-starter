import { Bot, Context } from "grammY";
import { logger } from "@/lib/logger";
import { type CallbackHandler } from "@/types/handlers";

export const callbacks: CallbackHandler[] = [
  {
    callbackData: "menu:dev",
    description: "Developer options",
    handler: async (ctx) => {
      await ctx.answerCallbackQuery();
      await ctx.reply("You selected Developer options");
      logger.info("CallbackHandler", "Handled menu:dev", {
        userId: ctx.from?.id,
      });
    },
    isPublic: true,
  },
  {
    callbackData: "menu:admin",
    description: "Admin options",
    handler: async (ctx) => {
      await ctx.answerCallbackQuery();
      await ctx.reply("You selected Admin options");
      logger.info("CallbackHandler", "Handled menu:admin", {
        userId: ctx.from?.id,
      });
    },
    isPublic: false,
  },
  {
    callbackData: "menu:help",
    description: "Help section",
    handler: async (ctx) => {
      await ctx.answerCallbackQuery();
      await ctx.reply("Here is the help section");
      logger.info("CallbackHandler", "Handled menu:help", {
        userId: ctx.from?.id,
      });
    },
    isPublic: true,
  },
];

export function registerCallbacks(bot: Bot<Context>) {
  callbacks.forEach((cb) => {
    bot.callbackQuery(cb.callbackData, cb.handler);
  });
}
