import type { Bot } from "grammy";

import { env } from "@/configs/env.config";
import type { Feature } from "@/configs/feature.config";
import type { BotContext } from "@/lib/bot";
import { buildCommandMenu } from "@/lib/build-command-menu";
import { logger } from "@/lib/logger";

export const registerCommandMenuHandler = async (
	bot: Bot<BotContext>,
	features: readonly Feature[],
): Promise<void> => {
	try {
		await bot.api.deleteMyCommands({
			scope: { type: "all_private_chats" },
		});
		logger.info("CommandMenu", "Private command menu cleared.");

		await bot.api.setMyCommands(buildCommandMenu(features, "public"));
		logger.info("CommandMenu", "Public command menu synced.");
	} catch (error) {
		logger.error("CommandMenu", "Failed to sync the public menu:", error);
	}

	const adminMenu = buildCommandMenu(features, "admin");
	const developerMenu = buildCommandMenu(features, "developer");

	const targets = [
		{ id: env.DEVELOPER_ID, role: "developer", menu: developerMenu },
		...[...env.ADMIN_IDS]
			.filter((id) => id !== env.DEVELOPER_ID)
			.map((id) => ({ id, role: "admin", menu: adminMenu })),
	];

	const results = await Promise.all(
		targets.map(async ({ id, role, menu }) => {
			try {
				await bot.api.setMyCommands(menu, {
					scope: { type: "chat", chat_id: id },
				});
				return true;
			} catch (error) {
				logger.warn(
					"CommandMenu",
					`Could not sync the ${role} menu. This usually means the ${role} has not sent /start to the bot yet.`,
					{ userId: id, error },
				);
				return false;
			}
		}),
	);

	logger.info(
		"CommandMenu",
		`Private menus synced for ${results.filter(Boolean).length}/${targets.length} privileged user(s).`,
	);
};
