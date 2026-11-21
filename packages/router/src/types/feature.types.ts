import type {
  CallbackQueryContext,
  CommandContext,
  Composer,
  Context,
} from "grammy"

import type { CallbackParams, CallbackRoute, RouteInfo } from "./route.types"

export type DefaultAccess = "public" | "admin" | "developer"

export interface CommandDefinition<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
> {
  readonly name: string
  readonly description: string
  readonly access?: TAccess
  /** Include this command in Telegram's `/` menu. Defaults to `true`. */
  readonly showInMenu?: boolean
  readonly handler: (ctx: CommandContext<C>) => void | Promise<void>
}

export interface CallbackConfig<
  C extends Context = Context,
  P extends string = string,
  TAccess extends string = DefaultAccess,
> {
  /** Either a `defineCallbackRoute(...)` object or a raw route pattern string. */
  readonly route: P | CallbackRoute<P>
  readonly access?: TAccess
  readonly handler: (
    ctx: CallbackQueryContext<C>,
    params: CallbackParams<P>
  ) => void | Promise<void>
}

export interface CallbackDefinition<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
> {
  readonly route: RouteInfo
  readonly access?: TAccess
  readonly handler: (
    ctx: CallbackQueryContext<C>,
    params: Readonly<Record<string, string>>
  ) => void | Promise<void>
}

export interface Feature<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
> {
  readonly name: string
  readonly access: TAccess
  readonly commands?: readonly CommandDefinition<C, TAccess>[]
  readonly callbacks?: readonly CallbackDefinition<C, TAccess>[]
  /** Optional escape hatch to mount custom grammY handlers on this feature's access scope. */
  readonly setup?: (composer: Composer<C>) => void
}

export interface FeatureHelpers<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
> {
  readonly defineCommand: (
    definition: CommandDefinition<C, TAccess>
  ) => CommandDefinition<C, TAccess>
  readonly defineCallback: <const P extends string>(
    config: CallbackConfig<C, P, TAccess>
  ) => CallbackDefinition<C, TAccess>
  readonly defineFeature: (feature: Feature<C, TAccess>) => Feature<C, TAccess>
}

export type ValidationProblemKind =
  | "feature"
  | "command"
  | "callback"
  | "menu"
  | "access"

export interface FeatureValidationProblem {
  readonly kind: ValidationProblemKind
  readonly message: string
  readonly feature?: string
  readonly target?: string
}

export interface ValidateFeaturesOptions<
  TAccess extends string = DefaultAccess,
> {
  /**
   * Enforce that callback patterns start with `<feature.name>:` to prevent
   * cross-feature collisions. Defaults to `true`.
   */
  readonly requireFeaturePrefix?: boolean
  /**
   * Optional ordered access tiers from lowest to highest privilege
   * (e.g., `["public", "admin", "developer"]`). Used to validate allowed
   * access values and cumulative Telegram command menu limits.
   */
  readonly tierOrder?: readonly TAccess[]
  /** Override Telegram's maximum commands per menu (default `100`). */
  readonly maxMenuCommands?: number
}
