import { Bot, type Context } from "grammY";
import { logger } from "@/lib/logger";
import { registerCommands, commands } from "@/handlers/commands";
import { registerCallbacks } from "@/handlers/callbacks";
import { env } from "@/config/env";

export const bot = new Bot<Context>(env.TELEGRAM_BOT_TOKEN);

registerCommands(bot);
registerCallbacks(bot);

export const startBot = async () => {
  try {
    await bot.start({
      onStart: async (botInfo) => {
        logger.info(
          "BotInit",
          `Bot @${botInfo.username} successfully started and connected to Telegram.`,
        );

        const publicCommands: Pick<
          (typeof commands)[number],
          "command" | "description"
        >[] = commands
          .filter((cmd) => cmd.isPublic)
          .map((cmd) => ({
            command: cmd.command,
            description: cmd.description,
          }));

        await bot.api.setMyCommands(publicCommands);
        logger.info("BotInit", "Public command menu updated successfully.");
      },
    });
  } catch (err) {
    logger.error("BotInit", "Error starting the bot:", err);
  }
};
