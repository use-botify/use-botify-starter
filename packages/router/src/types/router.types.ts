import type {
  Api,
  CallbackQueryContext,
  CommandContext,
  Composer,
  Context,
  MiddlewareFn,
} from "grammy"
import type { BotCommand } from "grammy/types"

import type { DefaultAccess, Feature } from "./feature.types"

export type RouterLogMeta = Readonly<Record<string, unknown>>

export interface RouterLogger {
  debug(scope: string, message: string, meta?: RouterLogMeta): void
  info(scope: string, message: string, meta?: RouterLogMeta): void
  warn(scope: string, message: string, meta?: RouterLogMeta): void
  error(scope: string, message: string, meta?: RouterLogMeta): void
  fatal(scope: string, message: string, meta?: RouterLogMeta): void
}

export type AccessGuard<C extends Context = Context> = (
  ctx: C
) => boolean | Promise<boolean>

export interface BuildCommandMenuOptions<
  TAccess extends string = DefaultAccess,
> {
  /**
   * Ordered access tiers from lowest to highest privilege
   * (e.g., `["public", "admin", "developer"]`). Higher tiers inherit
   * menu commands from lower tiers and can override descriptions.
   */
  readonly tierOrder?: readonly TAccess[]
}

export interface SyncCommandMenusOptions<
  TAccess extends string = DefaultAccess,
> {
  /** Ordered access tiers from lowest to highest privilege. */
  readonly tierOrder?: readonly TAccess[]
  /** Tier used for Telegram's global default menu. Defaults to `tierOrder[0]`. */
  readonly defaultTier?: TAccess
  /** Personal chat IDs per privileged tier to receive scoped menus. */
  readonly chatIdsByTier?: Partial<Record<TAccess, readonly number[]>>
  /** Optional logger for menu sync diagnostics. */
  readonly logger?: RouterLogger | false
}

export interface SyncChatFailure<TAccess extends string = DefaultAccess> {
  readonly chatId: number
  readonly tier: TAccess
  readonly reason: string
}

export interface SyncCommandMenusResult<
  TAccess extends string = DefaultAccess,
> {
  readonly defaultCommandCount: number
  readonly syncedChats: number
  readonly failedChats: readonly SyncChatFailure<TAccess>[]
}

export interface CreateRouterOptions<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
> {
  /** Features to validate and compile into the router. */
  readonly features: readonly Feature<C, TAccess>[]
  /**
   * Ordered access tiers from lowest to highest privilege.
   * Defaults to `["public", "admin", "developer"]`.
   */
  readonly tierOrder?: readonly TAccess[]
  /**
   * Tier treated as open access when no guard is provided for it.
   * Defaults to `tierOrder[0]` (`"public"`).
   */
  readonly publicTier?: TAccess
  /**
   * Access guard predicates keyed by tier. Every non-public tier referenced
   * by a feature must define a guard or `createRouter` will throw.
   */
  readonly guards?: Partial<Record<TAccess, AccessGuard<C>>>
  /** Enforce `<feature.name>:` prefix on callback patterns. Defaults to `true`. */
  readonly requireFeaturePrefix?: boolean
  /** Override Telegram's maximum commands per menu (default `100`). */
  readonly maxMenuCommands?: number
  /** Register fallback handlers that block unauthorized restricted commands/callbacks. Defaults to `true`. */
  readonly registerUnauthorizedGuards?: boolean
  /** Reset stale per-chat Telegram menus when an unauthorized user runs a restricted command in private chat. Defaults to `true`. */
  readonly resetStaleMenus?: boolean
  /** Custom handler when an unauthorized user triggers a restricted-only command. */
  readonly onUnauthorizedCommand?: (
    ctx: CommandContext<C>
  ) => void | Promise<void>
  /** Custom handler when an unauthorized user clicks a restricted callback button. */
  readonly onUnauthorizedCallback?: (
    ctx: CallbackQueryContext<C>
  ) => void | Promise<void>
  /** Optional logger (compatible with `@use-botify/core`'s `CoreLogger`). */
  readonly logger?: RouterLogger | false
}

export interface BotifyRouter<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
> {
  readonly composer: Composer<C>
  readonly middleware: MiddlewareFn<C>
  readonly features: readonly Feature<C, TAccess>[]
  readonly tierOrder: readonly TAccess[]
  buildCommandMenu(tier: TAccess): readonly BotCommand[]
  syncCommandMenus(
    api: Pick<Api, "setMyCommands" | "deleteMyCommands">,
    options?: Omit<SyncCommandMenusOptions<TAccess>, "tierOrder">
  ): Promise<SyncCommandMenusResult<TAccess>>
}
