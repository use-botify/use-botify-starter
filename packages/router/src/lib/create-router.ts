import { getErrorMessage } from "@workspace/utils"
import { type CommandContext, Composer, type Context } from "grammy"

import type {
  CallbackDefinition,
  CommandDefinition,
  DefaultAccess,
  Feature,
} from "../types/feature.types"
import type {
  AccessGuard,
  BotifyRouter,
  CreateRouterOptions,
  RouterLogger,
} from "../types/router.types"
import {
  buildCommandMenu,
  DEFAULT_ACCESS_TIERS,
  syncCommandMenus,
} from "./command-menu"
import { BotifyRouterError } from "./errors"
import { resolveAccess } from "./feature"
import { compareRouteSpecificity } from "./route"
import { validateFeatures } from "./validate"

const MAX_TRACKED_CHATS = 10_000

interface ScopedCommand<C extends Context, TAccess extends string> {
  readonly feature: Feature<C, TAccess>
  readonly command: CommandDefinition<C, TAccess>
  readonly access: TAccess
}

interface ScopedCallback<C extends Context, TAccess extends string> {
  readonly feature: Feature<C, TAccess>
  readonly callback: CallbackDefinition<C, TAccess>
  readonly access: TAccess
}

function collectUsedTiers<C extends Context, TAccess extends string>(
  features: readonly Feature<C, TAccess>[]
): Set<TAccess> {
  const used = new Set<TAccess>()

  for (const feature of features) {
    used.add(feature.access)
    for (const command of feature.commands ?? []) {
      used.add(resolveAccess(feature, command))
    }
    for (const callback of feature.callbacks ?? []) {
      used.add(resolveAccess(feature, callback))
    }
  }

  return used
}

function findRestrictedOnlyCommands<C extends Context, TAccess extends string>(
  features: readonly Feature<C, TAccess>[],
  publicTier: TAccess | undefined
): string[] {
  const publicNames = new Set<string>()
  const restrictedNames = new Set<string>()

  for (const feature of features) {
    for (const command of feature.commands ?? []) {
      const access = resolveAccess(feature, command)
      if (access === publicTier) {
        publicNames.add(command.name)
      } else {
        restrictedNames.add(command.name)
      }
    }
  }

  return [...restrictedNames].filter((name) => !publicNames.has(name))
}

function findRestrictedCallbackPatterns<
  C extends Context,
  TAccess extends string,
>(
  features: readonly Feature<C, TAccess>[],
  publicTier: TAccess | undefined
): RegExp[] {
  return features.flatMap((feature) =>
    (feature.callbacks ?? [])
      .filter((callback) => resolveAccess(feature, callback) !== publicTier)
      .map((callback) => callback.route.regex)
  )
}

function createStaleMenuResetter<C extends Context>(
  logger?: RouterLogger
): (ctx: CommandContext<C>) => Promise<void> {
  const alreadyReset = new Set<number>()

  const remember = (chatId: number): void => {
    if (alreadyReset.size >= MAX_TRACKED_CHATS) {
      const oldest = alreadyReset.values().next().value
      if (oldest !== undefined) {
        alreadyReset.delete(oldest)
      }
    }
    alreadyReset.add(chatId)
  }

  return async (ctx) => {
    const { chat } = ctx
    if (chat.type !== "private" || alreadyReset.has(chat.id)) {
      return
    }

    remember(chat.id)

    await ctx.api
      .deleteMyCommands({ scope: { type: "chat", chat_id: chat.id } })
      .catch((error: unknown) => {
        logger?.warn("CommandMenu", "Could not reset a stale personal menu", {
          userId: ctx.from?.id,
          error: getErrorMessage(error),
        })
      })
  }
}

function mountScopedComposer<C extends Context, TAccess extends string>(
  root: Composer<C>,
  tier: TAccess,
  publicTier: TAccess | undefined,
  guards: Partial<Record<TAccess, AccessGuard<C>>>,
  child: Composer<C>
): void {
  const guard = guards[tier]

  if (guard) {
    root.filter(guard).use(child)
    return
  }

  if (tier === publicTier) {
    root.use(child)
    return
  }

  throw new BotifyRouterError(
    "UNKNOWN_ACCESS_TIER",
    `No access guard provided for restricted tier "${tier}". Pass guards.${tier} to createRouter().`
  )
}

/**
 * Validates features and compiles all commands, dynamic callbacks,
 * unauthorized fallbacks, and feature `setup` hooks into a grammY `Composer`.
 */
export function createRouter<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
>(options: CreateRouterOptions<C, TAccess>): BotifyRouter<C, TAccess> {
  const logger = options.logger === false ? undefined : options.logger
  const tierOrder = Object.freeze([
    ...(options.tierOrder ??
      (DEFAULT_ACCESS_TIERS as unknown as readonly TAccess[])),
  ])

  if (tierOrder.length === 0) {
    throw new BotifyRouterError(
      "UNKNOWN_ACCESS_TIER",
      "createRouter() requires at least one tier in tierOrder."
    )
  }

  const publicTier = options.publicTier ?? tierOrder[0]
  const guards: Partial<Record<TAccess, AccessGuard<C>>> = options.guards ?? {}
  const features = Object.freeze([...options.features])

  validateFeatures(features, {
    requireFeaturePrefix: options.requireFeaturePrefix,
    tierOrder,
    maxMenuCommands: options.maxMenuCommands,
  })

  // Ensure every restricted tier referenced by features has an explicit guard.
  const usedTiers = collectUsedTiers(features)
  for (const tier of usedTiers) {
    if (tier !== publicTier && !guards[tier]) {
      throw new BotifyRouterError(
        "UNKNOWN_ACCESS_TIER",
        `No access guard provided for restricted tier "${tier}". Pass guards.${tier} to createRouter().`
      )
    }
  }

  const commandsByTier = new Map<TAccess, ScopedCommand<C, TAccess>[]>()
  const callbacksByTier = new Map<TAccess, ScopedCallback<C, TAccess>[]>()

  for (const tier of tierOrder) {
    commandsByTier.set(tier, [])
    callbacksByTier.set(tier, [])
  }

  for (const feature of features) {
    for (const command of feature.commands ?? []) {
      const access = resolveAccess(feature, command)
      commandsByTier.get(access)?.push({ feature, command, access })
    }

    for (const callback of feature.callbacks ?? []) {
      const access = resolveAccess(feature, callback)
      callbacksByTier.get(access)?.push({ feature, callback, access })
    }
  }

  const composer = new Composer<C>()
  const highestToLowest = [...tierOrder].reverse()

  // Phase 1: Register scoped commands and specificity-sorted callbacks.
  for (const tier of highestToLowest) {
    const tierCommands = commandsByTier.get(tier) ?? []
    const tierCallbacks = callbacksByTier.get(tier) ?? []

    if (tierCommands.length === 0 && tierCallbacks.length === 0) {
      continue
    }

    const scope = new Composer<C>()

    for (const { feature, command, access } of tierCommands) {
      scope.command(command.name, async (ctx) => {
        logger?.debug("Command", `/${command.name}`, {
          feature: feature.name,
          access,
          userId: ctx.from?.id,
        })
        await command.handler(ctx)
      })
    }

    const sortedCallbacks = [...tierCallbacks].sort((a, b) =>
      compareRouteSpecificity(a.callback.route, b.callback.route)
    )

    for (const { feature, callback, access } of sortedCallbacks) {
      const { route } = callback

      scope.callbackQuery(route.regex, async (ctx, next) => {
        const params = route.match(ctx.callbackQuery.data)
        if (!params) {
          await next()
          return
        }

        logger?.debug("Callback", route.pattern, {
          feature: feature.name,
          access,
          userId: ctx.from.id,
          data: ctx.callbackQuery.data,
        })
        await callback.handler(ctx, params)
      })
    }

    mountScopedComposer(composer, tier, publicTier, guards, scope)
  }

  // Phase 2: Register unauthorized fallback guards for restricted commands/callbacks.
  if (options.registerUnauthorizedGuards !== false) {
    const resetStaleMenu =
      options.resetStaleMenus !== false
        ? createStaleMenuResetter<C>(logger)
        : undefined

    const restrictedCommands = findRestrictedOnlyCommands(features, publicTier)
    if (restrictedCommands.length > 0) {
      composer.command(restrictedCommands, async (ctx) => {
        logger?.warn("Unauthorized", "Blocked a restricted command", {
          userId: ctx.from?.id,
          command: ctx.msg?.text?.split(/\s/, 1)[0],
        })

        if (resetStaleMenu) {
          await resetStaleMenu(ctx)
        }

        if (options.onUnauthorizedCommand) {
          await options.onUnauthorizedCommand(ctx)
        }
      })
    }

    const restrictedCallbacks = findRestrictedCallbackPatterns(
      features,
      publicTier
    )
    if (restrictedCallbacks.length > 0) {
      composer.callbackQuery(restrictedCallbacks, async (ctx) => {
        logger?.warn("Unauthorized", "Blocked a restricted callback", {
          userId: ctx.from.id,
          callback: ctx.callbackQuery.data,
        })

        if (options.onUnauthorizedCallback) {
          await options.onUnauthorizedCallback(ctx)
          return
        }

        await ctx.answerCallbackQuery().catch(() => undefined)
      })
    }
  }

  // Phase 3: Mount optional feature.setup() hooks inside their access scopes.
  for (const tier of highestToLowest) {
    const setupFeatures = features.filter(
      (feature) => feature.access === tier && feature.setup !== undefined
    )

    if (setupFeatures.length === 0) {
      continue
    }

    const setupScope = new Composer<C>()
    for (const feature of setupFeatures) {
      feature.setup?.(setupScope)
    }

    mountScopedComposer(composer, tier, publicTier, guards, setupScope)
  }

  return Object.freeze<BotifyRouter<C, TAccess>>({
    composer,
    middleware: composer.middleware(),
    features,
    tierOrder,
    buildCommandMenu: (tier) => buildCommandMenu(features, tier, { tierOrder }),
    syncCommandMenus: (api, syncOptions) =>
      syncCommandMenus(api, features, {
        ...syncOptions,
        tierOrder,
        defaultTier: syncOptions?.defaultTier ?? publicTier,
        logger: syncOptions?.logger ?? options.logger,
      }),
  })
}
