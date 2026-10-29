import { db } from "@/lib/database.prisma";
import { logger } from "@/lib/logger";
import { checkToDatabaseTelegramUserId } from "@/utils/telegram-id";
import type { User } from "grammy/types";

export async function setUserActive(
  telegramId: number,
  isActive: boolean,
): Promise<void> {
  try {
    await db.user.updateMany({
      where: { id: checkToDatabaseTelegramUserId(telegramId) },
      data: { isActive },
    });
  } catch (error) {
    logger.error("Users", "Failed to update isActive", {
      userId: telegramId,
      isActive,
      error,
    });
  }
}

export async function upsertUserProfile(user: User): Promise<void> {
  try {
    const id = checkToDatabaseTelegramUserId(user.id);
    const profile = {
      username: user.username ?? null,
      firstName: user.first_name,
      isActive: true,
    };

    await db.user.upsert({
      where: { id },
      update: profile,
      create: { id, ...profile },
    });
  } catch (error) {
    logger.error("Users", "Failed to upsert user in database", {
      userId: user.id,
      error,
    });
  }
}
