import { env } from "@/config/env";
import {
  registerAdminCallbacks,
  registerPublicCallbacks,
} from "@/handlers/callbacks";
import {
  adminCommandsMenu,
  publicCommandsMenu,
  registerAdminCommands,
  registerPublicCommands,
} from "@/handlers/commands";
import { bot } from "@/lib/bot";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/middlewares/rate-limit";
import { registerChatMemberHandlers } from "@/handlers/chat-member";
import { maintenanceMiddleware } from "./middlewares/maintenance";

bot.use(rateLimit({ windowMs: 3000, maxRequests: 3 }));
bot.use(maintenanceMiddleware);

registerChatMemberHandlers(bot);
registerPublicCommands(bot);
registerAdminCommands(bot);
registerPublicCallbacks(bot);
registerAdminCallbacks(bot);

const syncCommandMenus = async (): Promise<void> => {
  try {
    await bot.api.setMyCommands(publicCommandsMenu);
    logger.info("BotInit", "Public command menu synced successfully.");
  } catch (err) {
    logger.error("BotInit", "Failed to sync public command menu:", err);
  }

  try {
    await bot.api.setMyCommands(adminCommandsMenu, {
      scope: { type: "chat", chat_id: Number(env.ADMIN_ID) },
    });
    logger.info("BotInit", "Admin command menu synced successfully.");
  } catch (err) {
    logger.warn(
      "BotInit",
      "Could not sync Admin command menu (ensure ADMIN_ID has started a chat with the bot).",
      { error: err },
    );
  }
};

const shutdown = async (signal: string): Promise<void> => {
  logger.info(
    "BotShutdown",
    `Received ${signal}. Stopping bot and closing DB connection...`,
  );
  try {
    await bot.stop();
    await db.$disconnect();
    logger.info("BotShutdown", "Graceful shutdown completed.");
    process.exit(0);
  } catch (err) {
    logger.error("BotShutdown", "Error during graceful shutdown:", err);
    process.exit(1);
  }
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error("Process", "Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("Process", "Uncaught Exception:", err);
  void shutdown("uncaughtException");
});

const startBot = async (): Promise<void> => {
  try {
    await bot.start({
      onStart: async (botInfo) => {
        logger.info(
          "BotInit",
          `Bot @${botInfo.username} successfully started and connected to Telegram.`,
        );
        await syncCommandMenus();
      },
    });
  } catch (err) {
    logger.error("BotInit", "Fatal error starting the bot:", err);
    await db.$disconnect();
    process.exit(1);
  }
};

await startBot();
