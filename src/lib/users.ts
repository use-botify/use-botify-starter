import type { User as TelegramUser } from "grammy/types";

import { db } from "@/lib/database.prisma";
import { logger } from "@/lib/logger";

export const upsertUser = async (user: TelegramUser): Promise<void> => {
	const profile = {
		username: user.username ?? null,
		firstName: user.first_name,
		isActive: true,
	};

	await db.user.upsert({
		where: { id: BigInt(user.id) },
		create: { id: BigInt(user.id), ...profile },
		update: profile,
	});
};

export const setUserActive = async (
	telegramId: number,
	isActive: boolean,
): Promise<void> => {
	try {
		await db.user.updateMany({
			where: { id: BigInt(telegramId) },
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
