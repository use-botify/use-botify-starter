import path from "node:path"
import { pathToFileURL } from "node:url"

import type { Plugin } from "vite"

import type { ShareCoreModulesOptions } from "../types/hmr.types"

export const DEFAULT_SCRIPT_PATTERN = /\.[cm]?tsx?$/
export const DEFAULT_SHARED_MODULES_KEY = "__botifySharedModules"

type SharedModuleMap = Map<string, Record<string, unknown>>

export function toPosixPath(filePath: string): string {
  return filePath.replaceAll("\\", "/")
}

function getSharedModuleStore(sharedKey: string): SharedModuleMap {
  const globalRecord = globalThis as Record<string, unknown>
  const existing = globalRecord[sharedKey]

  if (existing instanceof Map) {
    return existing as SharedModuleMap
  }

  const store: SharedModuleMap = new Map()
  Object.defineProperty(globalThis, sharedKey, {
    value: store,
    configurable: true,
    writable: true,
  })

  return store
}

function stripQuery(id: string): string {
  const queryIndex = id.indexOf("?")
  return queryIndex >= 0 ? id.slice(0, queryIndex) : id
}

/**
 * Vite plugin that proxies non-feature project modules from the host Node.js
 * module graph so database clients, loggers, and singletons are never
 * duplicated across feature hot reloads.
 */
export function createShareCoreModulesPlugin(
  options: ShareCoreModulesOptions
): Plugin {
  const sourceRoot = toPosixPath(path.resolve(options.sourceDir)).replace(
    /\/+$/,
    ""
  )
  const featuresRoot = toPosixPath(path.resolve(options.featuresDir)).replace(
    /\/+$/,
    ""
  )
  const scriptPattern = options.scriptPattern ?? DEFAULT_SCRIPT_PATTERN
  const sharedKey = options.sharedKey ?? DEFAULT_SHARED_MODULES_KEY
  const sharedModules = getSharedModuleStore(sharedKey)

  const isCoreFile =
    options.shouldShare ??
    ((filePath: string): boolean =>
      filePath.startsWith(`${sourceRoot}/`) &&
      !filePath.startsWith(`${featuresRoot}/`) &&
      scriptPattern.test(filePath))

  return {
    name: "botify:share-core-modules",
    enforce: "pre",
    async load(id) {
      const file = toPosixPath(stripQuery(id))

      if (!isCoreFile(file)) {
        return null
      }

      const real = (await import(pathToFileURL(file).href)) as Record<
        string,
        unknown
      >
      sharedModules.set(file, real)

      const exportNames = Object.keys(real).filter((name) => name !== "default")
      const lines = [
        `const shared = globalThis[${JSON.stringify(sharedKey)}].get(${JSON.stringify(file)})`,
      ]

      if (exportNames.length > 0) {
        lines.push(`export const { ${exportNames.join(", ")} } = shared`)
      }

      if ("default" in real) {
        lines.push("export default shared.default")
      }

      return lines.join("\n")
    },
  }
}
