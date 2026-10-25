import { type Context, GrammyError, type NextFunction } from "grammy";

import { logger } from "@/lib/logger";

export async function autoAnswerCallback(
	ctx: Context,
	next: NextFunction,
): Promise<void> {
	if (!ctx.callbackQuery) {
		await next();
		return;
	}

	let answered = false;

	ctx.api.config.use(async (prev, method, payload, signal) => {
		if (method !== "answerCallbackQuery") {
			return prev(method, payload, signal);
		}

		if (answered) {
			return { ok: true, result: true } as Awaited<ReturnType<typeof prev>>;
		}

		answered = true;

		try {
			return await prev(method, payload, signal);
		} catch (error) {
			if (
				error instanceof GrammyError &&
				error.error_code === 400 &&
				(error.description.includes("query is too old") ||
					error.description.includes("query ID is invalid"))
			) {
				logger.debug("CallbackGuard", "Ignored expired callback query", {
					callbackData: ctx.callbackQuery?.data,
					userId: ctx.from?.id,
				});
				return { ok: true, result: true } as Awaited<ReturnType<typeof prev>>;
			}

			throw error;
		}
	});

	try {
		await next();
	} finally {
		if (!answered) {
			await ctx.answerCallbackQuery().catch(() => {});
		}
	}
}
