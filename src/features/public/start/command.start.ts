import { db } from "@/lib/database.prisma";
import { logger } from "@/lib/logger";
import type { CommandContextWithBotContext } from "@/configs/feature.config";

export async function startCommand(
  ctx: CommandContextWithBotContext,
): Promise<void> {
  if (!ctx.from?.id) return;

  const telegramId = BigInt(ctx.from.id);
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;

  try {
    await db.user.upsert({
      where: { id: telegramId },
      update: { username, firstName, isActive: true },
      create: { id: telegramId, username, firstName, isActive: true },
    });
  } catch (err) {
    logger.error("StartCommand", "Failed to upsert user in database", {
      userId: ctx.from.id,
      error: err,
    });
  }

  await ctx.reply("Hello, this is start command");
}
