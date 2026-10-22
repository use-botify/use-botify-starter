import type { Context } from "grammy";
import {
  ADMIN_CALLBACKS,
  PUBLIC_CALLBACKS,
  TypedInlineKeyboard,
} from "@/lib/callbacks";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getImage } from "@/lib/get-image";

export async function startCommand(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  logger.info("StartHandler", "Received /start command", {
    userId: ctx.from.id,
  });

  const telegramId = BigInt(ctx.from.id);
  const username = ctx.from.username ?? null;
  const firstName = ctx.from.first_name;

  try {
    await db.user.upsert({
      where: { id: telegramId },
      update: { username, firstName, isActive: true },
      create: { id: telegramId, username, firstName, isActive: true },
    });
  } catch (err) {
    logger.error("StartHandler", "Failed to upsert user in database", {
      userId: ctx.from.id,
      error: err,
    });
  }

  const displayName = username ? `@${username}` : firstName;

  const keyboard = new TypedInlineKeyboard().text(
    "📖 Help",
    PUBLIC_CALLBACKS.HELP,
  );

  const adminPanelKeyboard = new TypedInlineKeyboard().text(
    "🛠️ Admin Panel",
    ADMIN_CALLBACKS.PANEL,
  );

  await ctx.reply(
    `Hey, ${displayName}!\n\nBot is running and ready to boost channels!`,
    { reply_markup: adminPanelKeyboard },
  );
}
