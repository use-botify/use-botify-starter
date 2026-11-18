import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

import type { Api } from "grammy"
import { createServer, normalizePath, type Plugin } from "vite"

import { logger } from "@/lib/logger"
import { registerCommandMenuHandler } from "@/handlers/register-command-menu.handler"
import {
  createHotModuleReplacementMiddleware,
  replaceHotModuleReplacementMiddleware,
} from "@/middlewares/hot-module-replacement.middleware"

type FeaturesModule = typeof import("@/features")

const projectRoot = process.cwd()
const sourceRoot = normalizePath(resolve(projectRoot, "src"))
const featuresRoot = `${sourceRoot}/features`

const FEATURES_ENTRY = "/src/features/index.ts"
const RELOAD_DEBOUNCE_MS = 150
const SHARED_KEY = "__botifySharedModules"
const SCRIPT_FILE = /\.[cm]?tsx?$/

const sharedModules = new Map<string, Record<string, unknown>>()

Object.defineProperty(globalThis, SHARED_KEY, {
  value: sharedModules,
  configurable: true,
})

function isFeatureFile(file: string): boolean {
  return file.startsWith(`${featuresRoot}/`) && SCRIPT_FILE.test(file)
}

function shareCoreModules(): Plugin {
  return {
    name: "botify:share-core-modules",
    enforce: "pre",
    async load(id) {
      const file = normalizePath(id.split("?")[0] ?? id)

      const isCore =
        file.startsWith(`${sourceRoot}/`) &&
        SCRIPT_FILE.test(file) &&
        !isFeatureFile(file)

      if (!isCore) return null

      const real = (await import(pathToFileURL(file).href)) as Record<
        string,
        unknown
      >
      sharedModules.set(file, real)

      const names = Object.keys(real).filter((name) => name !== "default")

      return [
        `const shared = globalThis.${SHARED_KEY}.get(${JSON.stringify(file)});`,
        names.length > 0
          ? `export const { ${names.join(", ")} } = shared;`
          : "",
        "default" in real ? "export default shared.default;" : "",
      ].join("\n")
    },
  }
}

export async function startHotModuleReplacement(api: Api) {
  const vite = await createServer({
    configFile: false,
    envFile: false,
    root: projectRoot,
    appType: "custom",
    logLevel: "error",
    clearScreen: false,
    plugins: [shareCoreModules()],
    resolve: {
      alias: [{ find: /^@\//, replacement: `${sourceRoot}/` }],
    },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false },
  })

  const reload = async (initial: boolean): Promise<void> => {
    let features: FeaturesModule["features"]

    try {
      const loaded = (await vite.ssrLoadModule(
        FEATURES_ENTRY
      )) as FeaturesModule

      features = loaded.features

      replaceHotModuleReplacementMiddleware(
        createHotModuleReplacementMiddleware(features)
      )
    } catch (error) {
      logger.error(
        "FeatureHMR",
        "Failed to reload features, previous handlers stay active",
        error
      )

      if (initial) throw error
      return
    }

    try {
      await registerCommandMenuHandler(api, features)
    } catch (error) {
      logger.error("FeatureHMR", "Command menu sync failed", error)
    }

    logger.info("FeatureHMR", "Features reloaded successfully", {
      featureCount: features.length,
    })
  }

  try {
    await reload(true)
  } catch (error) {
    await vite.close()
    throw error
  }

  let reloadTimer: ReturnType<typeof setTimeout> | undefined
  let reloadQueue: Promise<void> = Promise.resolve()

  const scheduleReload = (file: string): void => {
    if (!isFeatureFile(normalizePath(file))) return

    if (reloadTimer) clearTimeout(reloadTimer)

    reloadTimer = setTimeout(() => {
      reloadQueue = reloadQueue.then(() => reload(false))
    }, RELOAD_DEBOUNCE_MS)
  }

  vite.watcher.on("change", scheduleReload)
  vite.watcher.on("add", scheduleReload)
  vite.watcher.on("unlink", scheduleReload)

  logger.info("FeatureHMR", "Feature hot reloading enabled")

  return {
    close: async (): Promise<void> => {
      if (reloadTimer) clearTimeout(reloadTimer)

      await reloadQueue
      await vite.close()

      logger.info("FeatureHMR", "Feature hot reloading stopped")
    },
  }
}
