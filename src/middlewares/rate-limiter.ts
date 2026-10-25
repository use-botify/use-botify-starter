import type { Context, NextFunction } from "grammy";

import { logger } from "@/lib/logger";
import { isUserAdmin } from "@/middlewares/access-guard";
import { getCurrentTime } from "@/utils/get-current-details";

interface RateLimiterOptions {
  intervalWindowMs: number;
  maxRequests: number;
}

export function rateLimiter(
  { intervalWindowMs, maxRequests }: RateLimiterOptions = {
    intervalWindowMs: 3000,
    maxRequests: 3,
  },
) {
  const userTimestamps = new Map<number, number[]>();

  setInterval(() => {
    const now = getCurrentTime();
    for (const [userId, timestamps] of userTimestamps.entries()) {
      const validTime = timestamps.filter(
        (time) => now - time < intervalWindowMs,
      );
      if (validTime.length === 0) {
        userTimestamps.delete(userId);
      } else {
        userTimestamps.set(userId, validTime);
      }
    }
  }, 60_000).unref();

  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id;

    if (!userId || isUserAdmin(userId) || ctx.myChatMember) {
      await next();
      return;
    }

    const currentTime = getCurrentTime();
    const timestamps = userTimestamps.get(userId) ?? [];
    const recentRequests = timestamps.filter(
      (t) => currentTime - t < intervalWindowMs,
    );

    if (recentRequests.length >= maxRequests) {
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

      if (recentRequests.length === maxRequests) {
        recentRequests.push(currentTime);
        userTimestamps.set(userId, recentRequests);
        await ctx
          .reply("⏳ You are sending requests too fast. Please wait a moment.")
          .catch(() => {});
      }

      return;
    }

    recentRequests.push(currentTime);
    userTimestamps.set(userId, recentRequests);
    await next();
  };
}
