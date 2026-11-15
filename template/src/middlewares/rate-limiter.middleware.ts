import type { Context, NextFunction } from "grammy";

import { logger } from "@/lib/logger";
import { isUserAdmin } from "@/middlewares/access-guard.middleware";
import { getCurrentTime } from "@/utils/time";

type RateLimiterOptions = {
	intervalWindowMs: number;
	maxRequests: number;
};

type UserRateState = {
	timestamps: number[];
	warned: boolean;
};

const DEFAULT_OPTIONS: RateLimiterOptions = {
	intervalWindowMs: 3_000,
	maxRequests: 3,
};

const CLEANUP_INTERVAL_MS = 60_000;

function validateRateLimiterOptions(options: RateLimiterOptions): void {
	if (
		!Number.isSafeInteger(options.intervalWindowMs) ||
		options.intervalWindowMs <= 0
	) {
		throw new RangeError("intervalWindowMs must be a positive safe integer.");
	}

	if (!Number.isSafeInteger(options.maxRequests) || options.maxRequests <= 0) {
		throw new RangeError("maxRequests must be a positive safe integer.");
	}
}

export function rateLimiter(options: Partial<RateLimiterOptions> = {}) {
	const { intervalWindowMs, maxRequests } = { ...DEFAULT_OPTIONS, ...options };
	validateRateLimiterOptions({ intervalWindowMs, maxRequests });

	const userStates = new Map<number, UserRateState>();

	const prune = (state: UserRateState, now: number): void => {
		while (
			state.timestamps[0] !== undefined &&
			now - state.timestamps[0] >= intervalWindowMs
		) {
			state.timestamps.shift();
		}
	};

	setInterval(() => {
		const now = getCurrentTime();

		for (const [userId, state] of userStates) {
			prune(state, now);
			if (state.timestamps.length === 0) userStates.delete(userId);
		}
	}, CLEANUP_INTERVAL_MS).unref();

	return async (ctx: Context, next: NextFunction): Promise<void> => {
		const userId = ctx.from?.id;

		if (!userId || isUserAdmin(userId) || ctx.myChatMember) {
			return next();
		}

		const now = getCurrentTime();
		let state = userStates.get(userId);

		if (!state) {
			state = { timestamps: [], warned: false };
			userStates.set(userId, state);
		}

		prune(state, now);

		if (state.timestamps.length < maxRequests) {
			state.timestamps.push(now);
			state.warned = false;
			return next();
		}

		const firstBlock = !state.warned;
		state.warned = true;

		if (firstBlock) {
			logger.warn("RateLimit", "User exceeded rate limit", {
				userId,
				username: ctx.from?.username ?? null,
				requestsInWindow: state.timestamps.length,
			});
		}

		if (ctx.callbackQuery) {
			await ctx
				.answerCallbackQuery(
					firstBlock
						? { text: "⏳ Too many requests! Please slow down." }
						: undefined,
				)
				.catch(() => {});
		} else if (firstBlock) {
			await ctx
				.reply("⏳ You are sending requests too fast. Please wait a moment.")
				.catch(() => {});
		}
	};
}
