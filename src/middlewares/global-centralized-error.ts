import { randomUUID } from "node:crypto";

import { type BotError, type Context, GrammyError, HttpError } from "grammy";

import { logger } from "@/lib/logger";
import { setUserActive } from "@/lib/users";

const BENIGN_400 = [
	"message is not modified",
	"query is too old",
	"message to edit not found",
	"message to delete not found",
];

export async function globalCentralizedError(
	err: BotError<Context>,
): Promise<void> {
	const { ctx, error } = err;
	const errorId = randomUUID().slice(0, 8);

	const meta = {
		errorId,
		updateId: ctx.update.update_id,
		updateType: Object.keys(ctx.update).find((k) => k !== "update_id"),
		callbackData: ctx.callbackQuery?.data,
		userId: ctx.from?.id,
		chatId: ctx.chat?.id,
		chatType: ctx.chat?.type,
	};

	if (error instanceof GrammyError) {
		if (error.error_code === 403) {
			logger.info("TelegramBlocked", error.description, meta);
			if (ctx.chat?.type === "private") {
				await setUserActive(ctx.chat.id, false);
			}
			return;
		}
		if (error.error_code === 429) {
			logger.warn("TelegramFloodWait", "Rate limited by Telegram", {
				...meta,
				retryAfter: error.parameters.retry_after,
			});
			return;
		}
		if (
			error.error_code === 400 &&
			BENIGN_400.some((d) => error.description.includes(d))
		) {
			logger.info("TelegramBenign", error.description, meta);
			return;
		}
		logger.error("GrammyError", `[${error.error_code}] ${error.description}`, {
			...meta,
			method: error.method,
		});
	} else if (error instanceof HttpError) {
		logger.error("HttpError", "Could not reach Telegram", { ...meta, error });
		return;
	} else {
		logger.error("UnhandledBotError", "Error in middleware or handler", {
			...meta,
			error,
		});
	}

	if (ctx.callbackQuery) {
		await ctx
			.answerCallbackQuery({
				text: `⚠️ Something went wrong. Please try again later.\nReference: ${errorId}`,
				show_alert: true,
			})
			.catch((replyErr) => {
				logger.warn("ErrorHandler", "Fallback callback alert failed", {
					...meta,
					replyErr,
				});
			});
		return;
	}

	if (!ctx.chat) return;
	try {
		await ctx.reply(
			`⚠️ Something went wrong. Please try again later.\nReference: ${errorId}`,
		);
	} catch (replyErr) {
		logger.warn("ErrorHandler", "Fallback reply failed", { ...meta, replyErr });
	}
}
