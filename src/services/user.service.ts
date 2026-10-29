import { db } from "@/lib/database.prisma";
import { logger } from "@/lib/logger";
import { checkToDatabaseTelegramUserId } from "@/utils/telegram-id";

export const setUserActive = async (
  telegramId: number,
  isActive: boolean,
): Promise<void> => {
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
};
