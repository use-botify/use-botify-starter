import path from "node:path"
import process from "node:process"

import { getErrorMessage } from "@workspace/utils"
import type { Alias, Plugin, ViteDevServer } from "vite"

import { BotifyToolingError } from "../lib/errors"
import type {
  FeatureHmrController,
  HmrModuleLoader,
  StartFeatureHmrOptions,
} from "../types/hmr.types"
import {
  createShareCoreModulesPlugin,
  DEFAULT_SCRIPT_PATTERN,
  toPosixPath,
} from "./share-core-plugin"

const DEFAULT_DEBOUNCE_MS = 150
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g

function escapeRegExp(value: string): string {
  return value.replace(REGEX_SPECIALS, "\\$&")
}

function buildResolveAliases(
  sourceRootPosix: string,
  aliasPrefix: string | false | undefined,
  extraAliases?: StartFeatureHmrOptions["aliases"]
): Alias[] {
  const aliases: Alias[] = []

  if (aliasPrefix !== false) {
    const prefix = aliasPrefix ?? "@/"
    if (prefix.length > 0) {
      aliases.push({
        find: new RegExp(`^${escapeRegExp(prefix)}`),
        replacement: `${sourceRootPosix}/`,
      })
    }
  }

  if (extraAliases) {
    for (const alias of extraAliases) {
      aliases.push({
        find: alias.find,
        replacement: alias.replacement,
      })
    }
  }

  return aliases
}

/**
 * Starts a headless Vite SSR server that watches `features/` and runs
 * `onReload` on startup and on every debounced file change.
 *
 * Mount `controller.close` inside `app.onShutdown(...)` from `@use-botify/core`.
 */
export async function startFeatureHmr(
  options: StartFeatureHmrOptions
): Promise<FeatureHmrController> {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS

  if (!Number.isSafeInteger(debounceMs) || debounceMs < 0) {
    throw new BotifyToolingError(
      "INVALID_TOOLING_CONFIG",
      `debounceMs must be a non-negative safe integer (received ${String(debounceMs)}).`
    )
  }

  const logger = options.logger === false ? undefined : options.logger
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd())
  const sourceDir = path.resolve(
    options.sourceDir ?? path.join(projectRoot, "src")
  )
  const featuresDir = path.resolve(
    options.featuresDir ?? path.join(sourceDir, "features")
  )

  const sourceRootPosix = toPosixPath(sourceDir).replace(/\/+$/, "")
  const featuresRootPosix = toPosixPath(featuresDir).replace(/\/+$/, "")

  let createServer: typeof import("vite").createServer
  try {
    const viteModule = await import("vite")
    createServer = viteModule.createServer
  } catch (error: unknown) {
    throw new BotifyToolingError(
      "HMR_INIT_FAILED",
      `startFeatureHmr() requires "vite" to be installed: ${getErrorMessage(error)}`,
      { cause: error }
    )
  }

  const plugins: Plugin[] = []
  if (options.shareCoreModules !== false) {
    plugins.push(
      createShareCoreModulesPlugin({
        sourceDir,
        featuresDir,
      })
    )
  }
  if (options.vitePlugins) {
    plugins.push(...options.vitePlugins)
  }

  const aliases = buildResolveAliases(
    sourceRootPosix,
    options.aliasPrefix,
    options.aliases
  )

  let server: ViteDevServer
  try {
    server = await createServer({
      configFile: false,
      envFile: false,
      root: projectRoot,
      appType: "custom",
      logLevel: "error",
      clearScreen: false,
      plugins,
      resolve: aliases.length > 0 ? { alias: aliases } : undefined,
      optimizeDeps: { noDiscovery: true },
      server: { middlewareMode: true, hmr: false },
    })
  } catch (error: unknown) {
    throw new BotifyToolingError(
      "HMR_INIT_FAILED",
      `Failed to initialize Vite HMR server: ${getErrorMessage(error)}`,
      { cause: error }
    )
  }

  const shouldReload =
    options.shouldReload ??
    ((filePath: string): boolean =>
      filePath.startsWith(`${featuresRootPosix}/`) &&
      DEFAULT_SCRIPT_PATTERN.test(filePath))

  const loadModule: HmrModuleLoader = async (filePath) =>
    (await server.ssrLoadModule(toPosixPath(filePath))) as Record<
      string,
      unknown
    >

  let reloadCount = 0
  let closed = false
  let reloadTimer: ReturnType<typeof setTimeout> | undefined
  let reloadQueue: Promise<void> = Promise.resolve()

  const runReload = async (
    initial: boolean,
    changedFile?: string
  ): Promise<void> => {
    if (closed) {
      return
    }

    if (!initial) {
      server.moduleGraph.invalidateAll()
    }

    const nextCount = reloadCount + 1

    try {
      await options.onReload({
        initial,
        reloadCount: nextCount,
        changedFile,
        loadModule,
        server,
      })

      reloadCount = nextCount
      logger?.info("FeatureHMR", "Features reloaded", {
        reloadCount,
        initial,
        ...(changedFile ? { changedFile } : {}),
      })
    } catch (error: unknown) {
      logger?.error(
        "FeatureHMR",
        initial
          ? "Initial feature load failed"
          : "Feature reload failed; previous handlers stay active",
        {
          error: getErrorMessage(error),
          ...(changedFile ? { changedFile } : {}),
        }
      )

      if (options.onError) {
        await options.onError(error, { initial, changedFile })
      }

      if (initial) {
        throw new BotifyToolingError(
          "HMR_INIT_FAILED",
          `Initial feature HMR load failed: ${getErrorMessage(error)}`,
          { cause: error }
        )
      }
    }
  }

  try {
    await runReload(true)
  } catch (error: unknown) {
    closed = true
    await server.close().catch(() => undefined)
    throw error
  }

  const enqueueReload = (changedFile?: string): Promise<void> => {
    const nextRun = reloadQueue.then(() => runReload(false, changedFile))
    reloadQueue = nextRun.catch(() => undefined)
    return nextRun
  }

  const handleWatchEvent = (file: string): void => {
    if (closed) {
      return
    }

    const normalized = toPosixPath(path.resolve(file))
    if (!shouldReload(normalized)) {
      return
    }

    if (reloadTimer !== undefined) {
      clearTimeout(reloadTimer)
    }

    reloadTimer = setTimeout(() => {
      reloadTimer = undefined
      void enqueueReload(normalized)
    }, debounceMs)
  }

  server.watcher.on("change", handleWatchEvent)
  server.watcher.on("add", handleWatchEvent)
  server.watcher.on("unlink", handleWatchEvent)

  logger?.info("FeatureHMR", "Feature hot reloading enabled", {
    featuresDir: featuresRootPosix,
  })

  return Object.freeze<FeatureHmrController>({
    get reloadCount(): number {
      return reloadCount
    },
    featuresDir,
    reload: (changedFile?: string) => enqueueReload(changedFile),
    close: async (): Promise<void> => {
      if (closed) {
        return
      }

      closed = true

      if (reloadTimer !== undefined) {
        clearTimeout(reloadTimer)
        reloadTimer = undefined
      }

      server.watcher.off("change", handleWatchEvent)
      server.watcher.off("add", handleWatchEvent)
      server.watcher.off("unlink", handleWatchEvent)

      await reloadQueue
      await server.close()

      logger?.info("FeatureHMR", "Feature hot reloading stopped")
    },
  })
}
