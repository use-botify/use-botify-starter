import type { Context, NextFunction } from "grammy";

import { logger } from "@/lib/logger";
import { isUserAdmin } from "@/middlewares/access-guard";
import { getCurrentTime } from "@/utils/get-current-details";

interface RateLimiterOptions {
	intervalWindowMs: number;
	maxRequests: number;
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
	intervalWindowMs: 3000,
	maxRequests: 3,
};

const CLEANUP_INTERVAL_MS = 60_000;

interface UserRateState {
	timestamps: number[];
	warned: boolean;
}

export function rateLimiter({
	intervalWindowMs,
	maxRequests,
}: RateLimiterOptions = DEFAULT_OPTIONS) {
	const userStates = new Map<number, UserRateState>();

	setInterval(() => {
		const now = getCurrentTime();
		for (const [userId, state] of userStates.entries()) {
			const validTimestamps = state.timestamps.filter(
				(time) => now - time < intervalWindowMs,
			);
			if (validTimestamps.length === 0) {
				userStates.delete(userId);
			} else {
				userStates.set(userId, {
					timestamps: validTimestamps,
					warned: state.warned && validTimestamps.length >= maxRequests,
				});
			}
		}
	}, CLEANUP_INTERVAL_MS).unref();

	return async (ctx: Context, next: NextFunction): Promise<void> => {
		const userId = ctx.from?.id;

		if (!userId || isUserAdmin(userId) || ctx.myChatMember) {
			await next();
			return;
		}

		const currentTime = getCurrentTime();
		const state = userStates.get(userId) ?? { timestamps: [], warned: false };
		const recentRequests = state.timestamps.filter(
			(t) => currentTime - t < intervalWindowMs,
		);

		if (recentRequests.length >= maxRequests) {
			if (!state.warned) {
				userStates.set(userId, {
					timestamps: recentRequests,
					warned: true,
				});

				logger.warn("RateLimit", "User exceeded rate limit", {
					userId,
					username: ctx.from?.username ?? null,
					requestsInWindow: recentRequests.length,
				});

				if (ctx.callbackQuery) {
					await ctx
						.answerCallbackQuery({
							text: "⏳ Too many requests! Please slow down.",
							show_alert: false,
						})
						.catch(() => {});
					return;
				}

				await ctx
					.reply("⏳ You are sending requests too fast. Please wait a moment.")
					.catch(() => {});
				return;
			}

			userStates.set(userId, {
				timestamps: recentRequests,
				warned: true,
			});

			if (ctx.callbackQuery) {
				await ctx.answerCallbackQuery().catch(() => {});
			}
			return;
		}

		recentRequests.push(currentTime);
		userStates.set(userId, {
			timestamps: recentRequests,
			warned: false,
		});
		await next();
	};
}
