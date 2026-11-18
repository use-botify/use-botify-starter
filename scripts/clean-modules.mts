import { readdir, rm } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { createLogger } from "@workspace/logger"
import { formatDuration, getErrorMessage, hasErrorCode } from "@workspace/utils"

const ROOT_DIR = path.resolve(import.meta.dirname, "..")
const MODULE_DIR = "node_modules"
const SKIP_DIRS = new Set([".git", "context"])
const ARTIFACT_DIRS = new Set([".turbo", "dist", ".next", "out", "coverage"])

const log = createLogger({ name: "clean" })

function toRelativePosix(targetPath: string): string {
  return path.relative(ROOT_DIR, targetPath).replaceAll("\\", "/")
}

async function collectTargets(
  dir: string,
  includeModules: boolean,
  targets: string[]
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue
      }

      if (
        ARTIFACT_DIRS.has(entry.name) ||
        (includeModules && entry.name === MODULE_DIR)
      ) {
        targets.push(fullPath)
        continue
      }

      if (entry.name === MODULE_DIR) {
        continue
      }

      await collectTargets(fullPath, includeModules, targets)
      continue
    }

    if (entry.isFile() && entry.name.endsWith(".tsbuildinfo")) {
      targets.push(fullPath)
    }
  }
}

async function main(): Promise<void> {
  const start = performance.now()
  const dryRun = process.argv.includes("--dry-run")
  const keepModules = process.argv.includes("--keep-modules")
  const includeModules = !keepModules

  const targets: string[] = []
  await collectTargets(ROOT_DIR, includeModules, targets)

  if (targets.length === 0) {
    log.info("Workspace is already clean")
    return
  }

  // Delete deeper workspace folders first and root node_modules last.
  const rootNodeModules = path.join(ROOT_DIR, MODULE_DIR)
  targets.sort((a, b) => {
    if (a === rootNodeModules) {
      return 1
    }
    if (b === rootNodeModules) {
      return -1
    }
    return b.length - a.length
  })

  if (dryRun) {
    log.info({ count: targets.length }, "Dry run — paths matched for removal:")
    for (const target of targets) {
      log.info(`  - ${toRelativePosix(target)}`)
    }
    return
  }

  log.info({ count: targets.length }, "Cleaning workspace artifacts...")

  let removed = 0
  let failed = 0

  for (const target of targets) {
    const relative = toRelativePosix(target)

    try {
      await rm(target, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      })
      removed += 1
      log.info(`Removed ${relative}`)
    } catch (error: unknown) {
      failed += 1
      const locked =
        hasErrorCode(error, "EBUSY") || hasErrorCode(error, "EPERM")
      const hint = locked
        ? " (file locked — close active terminals/IDEs and retry)"
        : ""
      log.warn(
        { target: relative },
        `Skipped ${relative}: ${getErrorMessage(error)}${hint}`
      )
    }
  }

  log.info(
    {
      removed,
      failed,
      duration: formatDuration(performance.now() - start),
    },
    failed === 0
      ? "Workspace clean complete"
      : "Workspace clean finished with warnings"
  )

  if (failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  log.error({ err: error }, `Clean failed: ${getErrorMessage(error)}`)
  process.exitCode = 1
})
