import { autoRetry } from "@grammyjs/auto-retry";
import { type RunnerHandle, run, sequentialize } from "@grammyjs/runner";

import { env } from "@/configs/env.config";
import { features } from "@/features";
import { registerCommandMenuHandler } from "@/handlers/register-command-menu.handler";
import { registerFeatureHandler } from "@/handlers/register-feature.handler";
import { bot } from "@/lib/bot";
import { db } from "@/lib/database.prisma";
import { logger } from "@/lib/logger";
import { installProcessHooks, onShutdown, shutdown } from "@/lib/shutdown";
import { autoAnswerCallback } from "@/middlewares/auto-answer-callback";
import { globalCentralizedError } from "@/middlewares/global-centralized-error";
import { rateLimiter } from "@/middlewares/rate-limiter";

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
  run: () => db.$disconnect(),
});
installProcessHooks();

const main = async (): Promise<void> => {
  registerFeatureHandler(bot, features);

  await bot.init();

  await db.$connect();
  logger.info(
    "Main",
    "Database connection verified & connected successfully...",
  );

  await registerCommandMenuHandler(bot, features);

  await bot.api.deleteWebhook({
    drop_pending_updates: env.NODE_ENV !== "production",
  });

  botRunner = run(bot, {
    runner: {
      fetch: {
        allowed_updates: ["message", "callback_query", "my_chat_member"],
      },
    },
  });

  logger.info("BotInit", "Bot started and ready for commands", {
    bot: `@${bot.botInfo.username}`,
    botId: bot.botInfo.id,
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
