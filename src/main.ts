import { autoRetry } from "@grammyjs/auto-retry";
import { type RunnerHandle, run, sequentialize } from "@grammyjs/runner";

import { bot } from "@/lib/bot";
import { db } from "@/lib/database.prisma";
import { logger } from "@/lib/logger";
import { installProcessHooks, onShutdown, shutdown } from "@/lib/shutdown";
import { globalCentralizedError } from "@/middlewares/global-centralized-error";
import { rateLimiter } from "@/middlewares/rate-limiter";
import { autoAnswerCallback } from "@/middlewares/auto-answer-callback";

bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 10 }));

bot.use(
  sequentialize((ctx) => ctx.chat?.id.toString() ?? ctx.from?.id.toString()),
);
bot.use(autoAnswerCallback);
bot.use(rateLimiter({ intervalWindowMs: 3000, maxRequests: 3 }));

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
  await bot.init();

  await db.$connect();
  logger.info(
    "Main",
    "Database connection verified & connected successfully...",
  );

  await bot.api.deleteWebhook({ drop_pending_updates: true });

  botRunner = run(bot, {
    runner: {
      fetch: {
        allowed_updates: ["message", "callback_query", "my_chat_member"],
      },
    },
  });

  logger.info(
    "BotInit",
    `Bot @${bot.botInfo.username} (BOT_ID: ${bot.botInfo.id}) started and ready to take commands.`,
  );

  botRunner.task()?.catch((error: unknown) => {
    logger.error("Main", "Update runner stopped unexpectedly:", error);
    void shutdown("runnerCrashed", 1);
  });
};

main().catch((error) => {
  logger.error("Main", "Fatal error starting bot:", error);
  void shutdown("fatalStartupError", 1);
});
