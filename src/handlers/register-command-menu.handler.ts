import type { Api } from "grammy";
import type { BotCommand } from "grammy/types";

import { ACCESS_RANK, type Access } from "@/configs/access.config";
import { env } from "@/configs/env.config";
import { type Feature, resolveAccess } from "@/core";
import { logger } from "@/lib/logger";

type MenuEntry = { description: string; rank: number; showInMenu: boolean };

export function buildCommandMenu(
  features: readonly Feature[],
  viewerAccess: Access,
): BotCommand[] {
  const viewerRank = ACCESS_RANK[viewerAccess];
  const winners = new Map<string, MenuEntry>();

  for (const feature of features) {
    for (const command of feature.commands ?? []) {
      const rank = ACCESS_RANK[resolveAccess(feature, command)];
      if (rank > viewerRank) continue;

      const current = winners.get(command.name);
      if (current && current.rank > rank) continue;

      winners.set(command.name, {
        description: command.description,
        rank,
        showInMenu: command.showInMenu ?? true,
      });
    }
  }

  return [...winners]
    .filter(([, entry]) => entry.showInMenu)
    .map(([command, entry]) => ({ command, description: entry.description }));
}

export async function registerCommandMenusHandler(
  api: Api,
  features: readonly Feature[],
): Promise<void> {
  try {
    await api.deleteMyCommands({ scope: { type: "all_private_chats" } });
    logger.info("CommandMenu", "Private command menu cleared.");

    await api.setMyCommands(buildCommandMenu(features, "public"));
    logger.info("CommandMenu", "Public command menu synced.");
  } catch (error) {
    logger.error("CommandMenu", "Failed to sync the public menu:", error);
  }

  const developerMenu = buildCommandMenu(features, "developer");
  const adminMenu = buildCommandMenu(features, "admin");
  const adminIds = [...env.ADMIN_IDS].filter((id) => id !== env.DEVELOPER_ID);

  const targets = [
    {
      chatId: env.DEVELOPER_ID,
      role: "developer" as const,
      menu: developerMenu,
    },
    ...adminIds.map((chatId) => ({
      chatId,
      role: "admin" as const,
      menu: adminMenu,
    })),
  ];

  const results = await Promise.all(
    targets.map(async ({ chatId, role, menu }) => {
      try {
        await api.setMyCommands(menu, {
          scope: { type: "chat", chat_id: chatId },
        });
        return true;
      } catch (error) {
        logger.warn(
          "CommandMenu",
          `Could not sync the ${role} menu. This usually means the ${role} has not sent /start to the bot yet.`,
          { userId: chatId, error },
        );
        return false;
      }
    }),
  );

  logger.info(
    "CommandMenu",
    `Private menus synced for ${results.filter(Boolean).length}/${targets.length} privileged user(s).`,
  );
}
