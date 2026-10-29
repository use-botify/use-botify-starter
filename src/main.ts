import { autoRetry } from "@grammyjs/auto-retry";
import { type RunnerHandle, run, sequentialize } from "@grammyjs/runner";

import { features } from "@/features";

import { env } from "@/configs/env.config";

import { bot } from "@/lib/bot";
import { logger } from "@/lib/logger";
import { connectDatabase, disconnectDatabase } from "@/lib/database.prisma";
import { installProcessHooks, onShutdown, shutdown } from "@/lib/shutdown";

import { registerCommandMenuHandler } from "@/handlers/register-command-menu.handler";
import { registerFeaturesHandlers } from "@/handlers/register-features.handler";
import { registerIconsRegistryHandler } from "@/handlers/register-icons-registry.handler";
import { registerImageHandler } from "@/handlers/register-image.handler";

import { autoAnswerCallback } from "@/middlewares/auto-answer-callback.middleware";
import { globalCentralizedError } from "@/middlewares/global-centralized-error.middleware";
import { rateLimiter } from "@/middlewares/rate-limiter.middleware";

bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 10 }));

bot.use(autoAnswerCallback);
bot.use(rateLimiter({ intervalWindowMs: 3000, maxRequests: 3 }));
bot.use(
  sequentialize((ctx) => {
    if (ctx.chat) return `chat:${ctx.chat.id}`;
    if (ctx.from) return `user:${ctx.from.id}`;
    return undefined;
  }),
);

bot.catch(globalCentralizedError);

let botRunner: RunnerHandle | undefined;

onShutdown({
  name: "bot",
  phase: "ingress",
  run: async () => {
    if (botRunner?.isRunning()) await botRunner.stop();
  },
});
onShutdown({
  name: "database",
  phase: "resources",
  run: async () => await disconnectDatabase(),
});
installProcessHooks();

const main = async (): Promise<void> => {
  await registerImageHandler();

  await bot.init();
  await connectDatabase();

  await registerIconsRegistryHandler();

  registerFeaturesHandlers(bot, features);
  await registerCommandMenuHandler(bot.api, features);

  await bot.api.deleteWebhook({
    drop_pending_updates: env.NODE_ENV !== "production",
  });

  botRunner = run(bot, {
    runner: {
      fetch: {
        allowed_updates: ["message", "callback_query"],
      },
    },
    sink: { concurrency: env.BOT_CONCURRENCY },
  });

  logger.info("BotInit", "Bot started and ready for commands", {
    bot: `@${bot.botInfo.username}`,
    botId: bot.botInfo.id,
    concurrency: env.BOT_CONCURRENCY,
    dbPoolMax: env.DB_POOL_MAX,
  });

  botRunner.task()?.catch((error: unknown) => {
    logger.error("Main", "Update runner stopped unexpectedly:", error);
    void shutdown("runnerCrashed", 1);
  });
};

main().catch((error) => {
  logger.error("Main", "Fatal error starting bot:", error);
  void shutdown("fatalStartupError", 1);
});
