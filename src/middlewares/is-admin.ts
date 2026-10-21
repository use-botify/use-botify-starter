import type { Context, NextFunction } from "grammy";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export function isUserAdmin(userId?: number): boolean {
  if (!userId) return false;
  return BigInt(userId) === BigInt(env.ADMIN_ID);
}

export async function isAdmin(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.from) return;

  if (!isUserAdmin(ctx.from.id)) {
    logger.warn("AccessControl", "Unauthorized access attempt", {
      userId: ctx.from.id,
      username: ctx.from.username ?? null,
    });

    if (ctx.callbackQuery) {
      await ctx
        .answerCallbackQuery({
          text: "⛔ Access denied. Admin privileges required.",
          show_alert: true,
        })
        .catch(() => {});
      return;
    }

    await ctx.reply("⛔ Access denied. Admin privileges required.");
    return;
  }

  await next();
}
