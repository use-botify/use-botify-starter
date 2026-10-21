import { type Context, InlineKeyboard } from "grammy";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

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
      update: { username, firstName },
      create: { id: telegramId, username, firstName },
    });
  } catch (err) {
    logger.error("StartHandler", "Failed to upsert user in database", {
      userId: ctx.from.id,
      error: err,
    });
  }

  const keyboard = new InlineKeyboard().text("📖 Help", "public:help");

  await ctx.reply("Bot is running and ready to boost channels!", {
    reply_markup: keyboard,
  });
}
