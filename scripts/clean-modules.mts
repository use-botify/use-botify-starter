import type { Stats } from "node:fs"
import { glob, lstat, readFile, rm } from "node:fs/promises"
import { resolve } from "node:path"
import process from "node:process"

import { logger } from "@workspace/logger"

const LOGGER_CONTEXT = "CleanModules"
const MAX_RETRIES = 5
const RETRY_DELAY_MS = 300

// The root plus every workspace folder listed in pnpm-workspace.yaml.
const MODULE_PATTERNS = [
  "node_modules",
  "apps/*/node_modules",
  "packages/*/node_modules",
]

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code
  }

  return undefined
}

async function assertProjectRoot(projectRoot: string): Promise<void> {
  try {
    const packageJson = await readFile(
      resolve(projectRoot, "package.json"),
      "utf8"
    )
    const metadata: unknown = JSON.parse(packageJson)

    if (
      typeof metadata !== "object" ||
      metadata === null ||
      Array.isArray(metadata)
    ) {
      throw new Error("package.json must contain a JSON object.")
    }
  } catch (error: unknown) {
    throw new Error(
      `Project root validation failed: ${getErrorMessage(error)}`,
      { cause: error }
    )
  }
}

async function findModuleDirs(projectRoot: string): Promise<string[]> {
  const found: string[] = []

  for await (const entry of glob(MODULE_PATTERNS, { cwd: projectRoot })) {
    found.push(resolve(projectRoot, entry))
  }

  return found.sort()
}

async function removeModules(modulesPath: string): Promise<void> {
  let modulesStats: Stats

  try {
    modulesStats = await lstat(modulesPath)
  } catch (error: unknown) {
    if (getErrorCode(error) === "ENOENT") return
    throw new Error(
      `Unable to inspect ${modulesPath}: ${getErrorMessage(error)}`,
      { cause: error }
    )
  }

  if (modulesStats.isSymbolicLink() || !modulesStats.isDirectory()) {
    throw new Error(
      `Refusing to remove ${modulesPath} because it is not a regular directory.`
    )
  }

  logger.warn(LOGGER_CONTEXT, `Removing dependency directory: ${modulesPath}`)

  try {
    await rm(modulesPath, {
      recursive: true,
      force: true,
      maxRetries: MAX_RETRIES,
      retryDelay: RETRY_DELAY_MS,
    })
  } catch (error: unknown) {
    throw new Error(
      `Failed to remove ${modulesPath}: ${getErrorMessage(error)}`,
      { cause: error }
    )
  }

  try {
    await lstat(modulesPath)
    throw new Error(`Cleanup verification failed: ${modulesPath} still exists.`)
  } catch (error: unknown) {
    if (getErrorCode(error) !== "ENOENT") throw error
  }
}

async function cleanModules(): Promise<void> {
  const projectRoot = process.cwd()

  logger.info(LOGGER_CONTEXT, `Starting dependency cleanup in: ${projectRoot}`)

  await assertProjectRoot(projectRoot)

  const moduleDirs = await findModuleDirs(projectRoot)

  if (moduleDirs.length === 0) {
    logger.info(
      LOGGER_CONTEXT,
      "No node_modules folders found. Nothing to clean."
    )
    return
  }

  let removed = 0
  let failed = 0

  for (const modulesPath of moduleDirs) {
    try {
      await removeModules(modulesPath)
      removed++
    } catch (error: unknown) {
      logger.error(LOGGER_CONTEXT, getErrorMessage(error))
      failed++
    }
  }

  logger.info(LOGGER_CONTEXT, "Cleanup summary.", {
    found: moduleDirs.length,
    removed,
    failed,
  })

  if (failed > 0) {
    throw new Error(`${failed} node_modules folder(s) could not be removed.`)
  }

  logger.info(LOGGER_CONTEXT, "Successfully removed all node_modules folders.")
}

cleanModules().catch((error: unknown) => {
  logger.error(LOGGER_CONTEXT, `Cleanup failed: ${getErrorMessage(error)}`)

  if (error instanceof Error && error.stack) {
    logger.debug(LOGGER_CONTEXT, error.stack)
  }

  process.exitCode = 1
})
