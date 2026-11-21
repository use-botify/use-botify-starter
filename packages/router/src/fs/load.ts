import { pathToFileURL } from "node:url"

import { getErrorMessage } from "@workspace/utils"
import type { Composer, Context } from "grammy"

import { createRouter } from "../lib/create-router"
import { BotifyRouterError } from "../lib/errors"
import { defineCallbackRoute } from "../lib/route"
import type {
  CallbackDefinition,
  CommandDefinition,
  DefaultAccess,
  Feature,
} from "../types/feature.types"
import type {
  CallbackFileConfig,
  CallbackHandler,
  CommandFileConfig,
  CommandHandler,
  CreateFsRouterOptions,
  DiscoveredRouteFile,
  FeatureFileConfig,
  FsBotifyRouter,
  LoadFeaturesOptions,
  ModuleLoader,
} from "../types/fs.types"
import type { RouteInfo } from "../types/route.types"
import { discoverRoutes } from "./discover"

interface FeatureAccumulator<C extends Context, TAccess extends string> {
  name: string
  access: TAccess
  hasExplicitAccess: boolean
  commands: CommandDefinition<C, TAccess>[]
  callbacks: CallbackDefinition<C, TAccess>[]
  setups: ((composer: Composer<C>) => void)[]
}

const defaultModuleLoader: ModuleLoader = async (filePath) =>
  (await import(pathToFileURL(filePath).href)) as Record<string, unknown>

const defaultDescription = (commandName: string): string =>
  `Run /${commandName}`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isRouteInfo(value: unknown): value is RouteInfo {
  return (
    isRecord(value) &&
    typeof value.pattern === "string" &&
    Array.isArray(value.segments) &&
    value.regex instanceof RegExp &&
    typeof value.match === "function"
  )
}

function isCommandDefinition<C extends Context, TAccess extends string>(
  value: unknown
): value is CommandDefinition<C, TAccess> {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.handler === "function"
  )
}

function isCallbackDefinition<C extends Context, TAccess extends string>(
  value: unknown
): value is CallbackDefinition<C, TAccess> {
  return (
    isRecord(value) &&
    isRouteInfo(value.route) &&
    typeof value.handler === "function"
  )
}

function isFeatureDefinition<C extends Context, TAccess extends string>(
  value: unknown
): value is Feature<C, TAccess> {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.access === "string"
  )
}

function extractCommandsFromModule<C extends Context, TAccess extends string>(
  mod: Record<string, unknown>,
  file: DiscoveredRouteFile<TAccess>,
  getFallbackDescription: (name: string) => string
): CommandDefinition<C, TAccess>[] {
  const defaultExport = mod.default

  if (isCommandDefinition<C, TAccess>(defaultExport)) {
    return [defaultExport]
  }

  if (Array.isArray(defaultExport)) {
    const items = defaultExport.filter(isCommandDefinition<C, TAccess>)
    if (items.length > 0) {
      return items
    }
  }

  if (typeof defaultExport === "function") {
    const config = isRecord(mod.config)
      ? (mod.config as CommandFileConfig<TAccess>)
      : undefined

    const name =
      (typeof mod.name === "string" ? mod.name : undefined) ??
      config?.name ??
      file.commandName

    if (!name) {
      throw new BotifyRouterError(
        "ROUTE_DISCOVERY_ERROR",
        `Command file "${file.relativePath}" is missing a command name.`
      )
    }

    const description =
      (typeof mod.description === "string" ? mod.description : undefined) ??
      config?.description ??
      getFallbackDescription(name)

    const access =
      (typeof mod.access === "string" ? (mod.access as TAccess) : undefined) ??
      config?.access ??
      file.access

    const showInMenu =
      (typeof mod.showInMenu === "boolean" ? mod.showInMenu : undefined) ??
      config?.showInMenu

    return [
      Object.freeze<CommandDefinition<C, TAccess>>({
        name,
        description,
        access,
        ...(showInMenu !== undefined ? { showInMenu } : {}),
        handler: defaultExport as CommandHandler<C>,
      }),
    ]
  }

  const namedCommands: CommandDefinition<C, TAccess>[] = []
  for (const [exportKey, exportValue] of Object.entries(mod)) {
    if (exportKey === "default") {
      continue
    }

    if (isCommandDefinition<C, TAccess>(exportValue)) {
      namedCommands.push(exportValue)
    } else if (Array.isArray(exportValue)) {
      for (const entry of exportValue) {
        if (isCommandDefinition<C, TAccess>(entry)) {
          namedCommands.push(entry)
        }
      }
    }
  }

  if (namedCommands.length > 0) {
    return namedCommands
  }

  throw new BotifyRouterError(
    "ROUTE_DISCOVERY_ERROR",
    `Command file "${file.relativePath}" must export a default handler function or a defineCommand() object.`
  )
}

function extractCallbacksFromModule<C extends Context, TAccess extends string>(
  mod: Record<string, unknown>,
  file: DiscoveredRouteFile<TAccess>
): CallbackDefinition<C, TAccess>[] {
  const defaultExport = mod.default

  if (isCallbackDefinition<C, TAccess>(defaultExport)) {
    return [defaultExport]
  }

  if (Array.isArray(defaultExport)) {
    const items = defaultExport.filter(isCallbackDefinition<C, TAccess>)
    if (items.length > 0) {
      return items
    }
  }

  if (typeof defaultExport === "function") {
    const config = isRecord(mod.config)
      ? (mod.config as CallbackFileConfig<string, TAccess>)
      : undefined

    const rawRoute = mod.route ?? config?.route ?? file.callbackPattern
    const route = isRouteInfo(rawRoute)
      ? rawRoute
      : typeof rawRoute === "string"
        ? defineCallbackRoute(rawRoute)
        : undefined

    if (!route) {
      throw new BotifyRouterError(
        "ROUTE_DISCOVERY_ERROR",
        `Callback file "${file.relativePath}" is missing a valid callback route.`
      )
    }

    const access =
      (typeof mod.access === "string" ? (mod.access as TAccess) : undefined) ??
      config?.access ??
      file.access

    return [
      Object.freeze<CallbackDefinition<C, TAccess>>({
        route,
        access,
        handler: defaultExport as CallbackHandler<C>,
      }),
    ]
  }

  const namedCallbacks: CallbackDefinition<C, TAccess>[] = []
  for (const [exportKey, exportValue] of Object.entries(mod)) {
    if (exportKey === "default") {
      continue
    }

    if (isCallbackDefinition<C, TAccess>(exportValue)) {
      namedCallbacks.push(exportValue)
    } else if (Array.isArray(exportValue)) {
      for (const entry of exportValue) {
        if (isCallbackDefinition<C, TAccess>(entry)) {
          namedCallbacks.push(entry)
        }
      }
    }
  }

  if (namedCallbacks.length > 0) {
    return namedCallbacks
  }

  throw new BotifyRouterError(
    "ROUTE_DISCOVERY_ERROR",
    `Callback file "${file.relativePath}" must export a default handler function or a defineCallback() object.`
  )
}

function getOrCreateAccumulator<C extends Context, TAccess extends string>(
  map: Map<string, FeatureAccumulator<C, TAccess>>,
  name: string,
  access: TAccess
): FeatureAccumulator<C, TAccess> {
  const existing = map.get(name)
  if (existing) {
    return existing
  }

  const created: FeatureAccumulator<C, TAccess> = {
    name,
    access,
    hasExplicitAccess: false,
    commands: [],
    callbacks: [],
    setups: [],
  }
  map.set(name, created)
  return created
}

function mergeFeatureModule<C extends Context, TAccess extends string>(
  acc: FeatureAccumulator<C, TAccess>,
  mod: Record<string, unknown>,
  file: DiscoveredRouteFile<TAccess>
): void {
  const defaultExport = mod.default

  if (isFeatureDefinition<C, TAccess>(defaultExport)) {
    acc.access = defaultExport.access
    acc.hasExplicitAccess = true
    if (defaultExport.commands) {
      acc.commands.push(...defaultExport.commands)
    }
    if (defaultExport.callbacks) {
      acc.callbacks.push(...defaultExport.callbacks)
    }
    if (defaultExport.setup) {
      acc.setups.push(defaultExport.setup)
    }
    return
  }

  const config = isRecord(mod.config)
    ? (mod.config as FeatureFileConfig<C, TAccess>)
    : isRecord(defaultExport)
      ? (defaultExport as FeatureFileConfig<C, TAccess>)
      : undefined

  const access =
    (typeof mod.access === "string" ? (mod.access as TAccess) : undefined) ??
    config?.access

  if (access !== undefined) {
    acc.access = access
    acc.hasExplicitAccess = true
  }

  const setup =
    (typeof mod.setup === "function"
      ? (mod.setup as (composer: Composer<C>) => void)
      : undefined) ?? config?.setup

  if (setup) {
    acc.setups.push(setup)
    return
  }

  if (access !== undefined) {
    return
  }

  for (const [exportKey, exportValue] of Object.entries(mod)) {
    if (
      exportKey !== "default" &&
      isFeatureDefinition<C, TAccess>(exportValue)
    ) {
      acc.access = exportValue.access
      acc.hasExplicitAccess = true
      if (exportValue.commands) {
        acc.commands.push(...exportValue.commands)
      }
      if (exportValue.callbacks) {
        acc.callbacks.push(...exportValue.callbacks)
      }
      if (exportValue.setup) {
        acc.setups.push(exportValue.setup)
      }
      return
    }
  }

  throw new BotifyRouterError(
    "ROUTE_DISCOVERY_ERROR",
    `Feature file "${file.relativePath}" must export a defineFeature() object, access tier, or setup hook.`
  )
}

/**
 * Discovers and imports all route files in `featuresDir`, assembling them
 * into `Feature[]` ready for `createRouter()`.
 */
export async function loadFeatures<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
>(
  options: LoadFeaturesOptions<TAccess>
): Promise<{
  readonly features: readonly Feature<C, TAccess>[]
  readonly discoveredFiles: readonly DiscoveredRouteFile<TAccess>[]
}> {
  const discoveredFiles = await discoverRoutes(options)
  const loadModule = options.loadModule ?? defaultModuleLoader
  const getFallbackDescription =
    options.defaultCommandDescription ?? defaultDescription

  const accumulators = new Map<string, FeatureAccumulator<C, TAccess>>()

  // Process feature metadata files first so feature-level access defaults apply.
  const orderedFiles = [...discoveredFiles].sort((a, b) => {
    if (a.kind === "feature" && b.kind !== "feature") return -1
    if (a.kind !== "feature" && b.kind === "feature") return 1
    return a.relativePath.localeCompare(b.relativePath)
  })

  for (const file of orderedFiles) {
    let mod: Record<string, unknown>

    try {
      mod = await loadModule(file.filePath)
    } catch (error: unknown) {
      throw new BotifyRouterError(
        "ROUTE_DISCOVERY_ERROR",
        `Failed to load route module "${file.relativePath}": ${getErrorMessage(error)}`,
        { cause: error }
      )
    }

    const acc = getOrCreateAccumulator(
      accumulators,
      file.featureName,
      file.access
    )

    if (file.kind === "feature") {
      mergeFeatureModule(acc, mod, file)
      continue
    }

    if (file.kind === "command") {
      const commands = extractCommandsFromModule<C, TAccess>(
        mod,
        file,
        getFallbackDescription
      )
      acc.commands.push(...commands)
      continue
    }

    const callbacks = extractCallbacksFromModule<C, TAccess>(mod, file)
    acc.callbacks.push(...callbacks)
  }

  const features: Feature<C, TAccess>[] = []

  for (const acc of accumulators.values()) {
    const setup =
      acc.setups.length > 0
        ? (composer: Composer<C>) => {
            for (const runSetup of acc.setups) {
              runSetup(composer)
            }
          }
        : undefined

    features.push(
      Object.freeze<Feature<C, TAccess>>({
        name: acc.name,
        access: acc.access,
        ...(acc.commands.length > 0
          ? { commands: Object.freeze([...acc.commands]) }
          : {}),
        ...(acc.callbacks.length > 0
          ? { callbacks: Object.freeze([...acc.callbacks]) }
          : {}),
        ...(setup ? { setup } : {}),
      })
    )
  }

  return Object.freeze({
    features: Object.freeze(features),
    discoveredFiles,
  })
}

/**
 * Convenience helper that scans `featuresDir`, loads all feature modules,
 * merges optional `extraFeatures`, and compiles them into a `BotifyRouter`.
 */
export async function createFsRouter<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
>(
  options: CreateFsRouterOptions<C, TAccess>
): Promise<FsBotifyRouter<C, TAccess>> {
  const { features, discoveredFiles } = await loadFeatures<C, TAccess>(options)
  const combinedFeatures = options.extraFeatures
    ? [...features, ...options.extraFeatures]
    : features

  const router = createRouter<C, TAccess>({
    ...options,
    features: combinedFeatures,
  })

  return Object.freeze<FsBotifyRouter<C, TAccess>>({
    ...router,
    discoveredFiles,
  })
}
