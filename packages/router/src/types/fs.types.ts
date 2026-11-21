import type {
  CallbackQueryContext,
  CommandContext,
  Composer,
  Context,
} from "grammy"

import type { DefaultAccess, Feature } from "./feature.types"
import type { CallbackParams, CallbackRoute } from "./route.types"
import type { BotifyRouter, CreateRouterOptions } from "./router.types"

export type DiscoveredRouteKind = "command" | "callback" | "feature"

export interface DiscoveredRouteFile<TAccess extends string = DefaultAccess> {
  readonly kind: DiscoveredRouteKind
  /** Absolute path to the discovered file on disk. */
  readonly filePath: string
  /** POSIX-normalized path relative to `featuresDir`. */
  readonly relativePath: string
  /** Feature name inferred from the top-level non-group folder. */
  readonly featureName: string
  /** Access tier inferred from the nearest `(tier)` route group, or `defaultAccess`. */
  readonly access: TAccess
  /** Command name inferred for `command` files (snake_case, no leading slash). */
  readonly commandName?: string
  /** Callback route pattern inferred for `callback` files (e.g. `order:[id]`). */
  readonly callbackPattern?: string
}

export interface DiscoverRoutesOptions<TAccess extends string = DefaultAccess> {
  /** Absolute or relative path to the `features/` directory. */
  readonly featuresDir: string
  /** Fallback access tier when no `(tier)` route group wraps the file. Defaults to `"public"`. */
  readonly defaultAccess?: TAccess
  /** File extensions to scan. Defaults to `[".ts", ".mts", ".js", ".mjs"]`. */
  readonly extensions?: readonly string[]
}

export type ModuleLoader = (
  filePath: string
) => Promise<Record<string, unknown>>

export interface LoadFeaturesOptions<TAccess extends string = DefaultAccess>
  extends DiscoverRoutesOptions<TAccess> {
  /**
   * Custom module importer. Defaults to native ESM `import()`.
   * Pass `(file) => vite.ssrLoadModule(file)` for dev HMR.
   */
  readonly loadModule?: ModuleLoader
  /** Fallback description when a command file omits `description`. */
  readonly defaultCommandDescription?: (commandName: string) => string
}

export interface CommandFileConfig<TAccess extends string = DefaultAccess> {
  readonly name?: string
  readonly description?: string
  readonly access?: TAccess
  readonly showInMenu?: boolean
}

export interface CallbackFileConfig<
  P extends string = string,
  TAccess extends string = DefaultAccess,
> {
  readonly route?: P | CallbackRoute<P>
  readonly access?: TAccess
}

export interface FeatureFileConfig<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
> {
  readonly name?: string
  readonly access?: TAccess
  readonly setup?: (composer: Composer<C>) => void
}

export type CommandHandler<C extends Context = Context> = (
  ctx: CommandContext<C>
) => void | Promise<void>

export type CallbackHandler<
  C extends Context = Context,
  P extends string = string,
> = (
  ctx: CallbackQueryContext<C>,
  params: CallbackParams<P>
) => void | Promise<void>

export type CreateFsRouterOptions<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
> = LoadFeaturesOptions<TAccess> &
  Omit<CreateRouterOptions<C, TAccess>, "features"> & {
    /** Extra programmatically defined features merged alongside discovered ones. */
    readonly extraFeatures?: readonly Feature<C, TAccess>[]
  }

export type FsBotifyRouter<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
> = BotifyRouter<C, TAccess> & {
  readonly discoveredFiles: readonly DiscoveredRouteFile<TAccess>[]
}
