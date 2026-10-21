import type { Context, NextFunction } from "grammy";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export async function isAdmin(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.from) return;

  const adminId = BigInt(env.ADMIN_ID);
  const userId = BigInt(ctx.from.id);

  if (userId !== adminId) {
    logger.warn("AccessControl", "Unauthorized access attempt", {
      userId: ctx.from.id,
      username: ctx.from.username ?? null,
    });
    await ctx.reply("⛔ Access denied. Admin privileges required.");
    return;
  }

  await next();
}
