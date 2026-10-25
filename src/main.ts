import { autoRetry } from "@grammyjs/auto-retry";
import { sequentialize } from "@grammyjs/runner";

import { bot } from "@/lib/bot";
import { logger } from "@/lib/logger";

bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 10 }));

bot.use(
	sequentialize((ctx) => ctx.chat?.id.toString() ?? ctx.from?.id.toString()),
);

const main = async (): Promise<void> => {
	await bot.init();

	await bot.api.deleteWebhook({ drop_pending_updates: true });

	logger.info(
		"BotInit",
		`Bot @${bot.botInfo.username} (BOT_ID: ${bot.botInfo.id}) started and polling concurrently.`,
	);
};

main().catch((error) => {
	logger.error("App", "Fatal error starting bot:", error);
});
