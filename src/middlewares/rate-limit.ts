import type { Context, NextFunction } from "grammy";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 3000;
  const maxRequests = options.maxRequests ?? 3;
  const userTimestamps = new Map<number, number[]>();

  setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamps] of userTimestamps.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        userTimestamps.delete(userId);
      } else {
        userTimestamps.set(userId, valid);
      }
    }
  }, 60_000).unref();

  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const userId = ctx.from?.id;
    if (!userId) {
      await next();
      return;
    }

    if (BigInt(userId) === BigInt(env.ADMIN_ID)) {
      await next();
      return;
    }

    const now = Date.now();
    const timestamps = userTimestamps.get(userId) ?? [];
    const recentRequests = timestamps.filter((t) => now - t < windowMs);

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
        recentRequests.push(now);
        userTimestamps.set(userId, recentRequests);
        await ctx
          .reply("⏳ You are sending requests too fast. Please wait a moment.")
          .catch(() => {});
      }
      return;
    }

    recentRequests.push(now);
    userTimestamps.set(userId, recentRequests);

    await next();
  };
}
