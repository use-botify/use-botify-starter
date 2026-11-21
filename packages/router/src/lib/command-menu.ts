import { getErrorMessage } from "@workspace/utils"
import type { Api, Context } from "grammy"
import type { BotCommand } from "grammy/types"

import type { DefaultAccess, Feature } from "../types/feature.types"
import type {
  BuildCommandMenuOptions,
  RouterLogger,
  SyncChatFailure,
  SyncCommandMenusOptions,
  SyncCommandMenusResult,
} from "../types/router.types"
import { resolveAccess } from "./feature"

export const DEFAULT_ACCESS_TIERS = [
  "public",
  "admin",
  "developer",
] as const satisfies readonly DefaultAccess[]

function resolveMenuTiers<TAccess extends string>(
  tier: TAccess,
  tierOrder?: readonly TAccess[]
): readonly TAccess[] {
  if (tierOrder && tierOrder.length > 0) {
    const index = tierOrder.indexOf(tier)
    return index >= 0 ? tierOrder.slice(0, index + 1) : [tier]
  }

  const defaultIndex = (DEFAULT_ACCESS_TIERS as readonly string[]).indexOf(tier)
  if (defaultIndex >= 0) {
    return DEFAULT_ACCESS_TIERS.slice(
      0,
      defaultIndex + 1
    ) as unknown as readonly TAccess[]
  }

  return [tier]
}

/**
 * Builds the Telegram `BotCommand[]` list for a given access tier.
 * When `tierOrder` is ordered lowest → highest privilege, higher tiers inherit
 * commands from lower tiers and override descriptions on matching command names.
 */
export function buildCommandMenu<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
>(
  features: readonly Feature<C, TAccess>[],
  tier: TAccess,
  options: BuildCommandMenuOptions<TAccess> = {}
): readonly BotCommand[] {
  const includedTiers = resolveMenuTiers(tier, options.tierOrder)
  const commandsByName = new Map<string, string>()

  for (const currentTier of includedTiers) {
    for (const feature of features) {
      for (const command of feature.commands ?? []) {
        if (command.showInMenu === false) {
          continue
        }

        if (resolveAccess(feature, command) === currentTier) {
          commandsByName.set(command.name, command.description)
        }
      }
    }
  }

  const menu: BotCommand[] = []
  for (const [command, description] of commandsByName) {
    menu.push(Object.freeze({ command, description }))
  }

  return Object.freeze(menu)
}

function resolveOptionalLogger(
  logger?: RouterLogger | false
): RouterLogger | undefined {
  return logger === false ? undefined : logger
}

/**
 * Syncs Telegram's default global `/` menu and optional per-chat menus for
 * privileged tiers (e.g., `admin`, `developer`).
 *
 * If a chat ID appears in multiple tiers, only the highest-privilege tier's
 * menu is applied to that chat.
 */
export async function syncCommandMenus<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
>(
  api: Pick<Api, "setMyCommands" | "deleteMyCommands">,
  features: readonly Feature<C, TAccess>[],
  options: SyncCommandMenusOptions<TAccess> = {}
): Promise<SyncCommandMenusResult<TAccess>> {
  const logger = resolveOptionalLogger(options.logger)
  const tierOrder =
    options.tierOrder ?? (DEFAULT_ACCESS_TIERS as unknown as readonly TAccess[])
  const defaultTier = options.defaultTier ?? tierOrder[0]

  let defaultCommandCount = 0

  if (defaultTier !== undefined) {
    const defaultCommands = buildCommandMenu(features, defaultTier, {
      tierOrder,
    })
    defaultCommandCount = defaultCommands.length

    if (defaultCommands.length > 0) {
      await api.setMyCommands([...defaultCommands])
    } else {
      await api.deleteMyCommands()
    }

    logger?.info("CommandMenu", "Synced default command menu", {
      tier: defaultTier,
      count: defaultCommands.length,
    })
  }

  const assignedTierByChat = new Map<number, TAccess>()
  const chatIdsByTier = options.chatIdsByTier

  if (chatIdsByTier) {
    // Iterate lowest -> highest so higher-privilege tiers win on overlap.
    for (const tier of tierOrder) {
      if (tier === defaultTier) {
        continue
      }

      const ids = chatIdsByTier[tier]
      if (!ids) {
        continue
      }

      for (const chatId of ids) {
        assignedTierByChat.set(chatId, tier)
      }
    }
  }

  const menuCache = new Map<TAccess, readonly BotCommand[]>()
  const failedChats: SyncChatFailure<TAccess>[] = []
  let syncedChats = 0

  for (const [chatId, tier] of assignedTierByChat) {
    let menu = menuCache.get(tier)
    if (!menu) {
      menu = buildCommandMenu(features, tier, { tierOrder })
      menuCache.set(tier, menu)
    }

    try {
      const scope = { type: "chat" as const, chat_id: chatId }
      if (menu.length > 0) {
        await api.setMyCommands([...menu], { scope })
      } else {
        await api.deleteMyCommands({ scope })
      }
      syncedChats += 1
    } catch (error: unknown) {
      const reason = getErrorMessage(error)
      failedChats.push(Object.freeze({ chatId, tier, reason }))
      logger?.warn("CommandMenu", "Could not sync personal command menu", {
        chatId,
        tier,
        error: reason,
      })
    }
  }

  return Object.freeze({
    defaultCommandCount,
    syncedChats,
    failedChats: Object.freeze(failedChats),
  })
}
