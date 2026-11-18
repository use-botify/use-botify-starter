import { mkdir, readdir, rm, stat } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { createLogger } from "@workspace/logger"
import { formatDuration, getErrorMessage } from "@workspace/utils"
import { type CliOptions, runCli } from "repomix"

interface ContextTarget {
  label: string
  directories: string[]
  outputFile: string
}

const ROOT_DIR = path.resolve(import.meta.dirname, "..")
const CONTEXT_DIR = path.join(ROOT_DIR, "context")
const CONFIG_PATH = path.join(ROOT_DIR, "repomix.config.json")

const log = createLogger({ name: "context" })

async function directoryExists(targetPath: string): Promise<boolean> {
  try {
    const info = await stat(targetPath)
    return info.isDirectory()
  } catch {
    return false
  }
}

async function listSubdirectories(parentDir: string): Promise<string[]> {
  if (!(await directoryExists(parentDir))) {
    return []
  }

  const entries = await readdir(parentDir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

async function resolveTargets(): Promise<ContextTarget[]> {
  const targets: ContextTarget[] = [
    {
      label: "full monorepo",
      directories: ["."],
      outputFile: "full.md",
    },
  ]

  const packageDirs = await listSubdirectories(path.join(ROOT_DIR, "packages"))
  if (packageDirs.length > 0) {
    targets.push({
      label: "packages",
      directories: ["packages"],
      outputFile: "packages.md",
    })
  }

  const appDirs = await listSubdirectories(path.join(ROOT_DIR, "apps"))
  if (appDirs.length > 0) {
    targets.push({
      label: "all apps",
      directories: ["apps"],
      outputFile: "apps.md",
    })

    for (const appName of appDirs) {
      targets.push({
        label: `app:${appName}`,
        directories: [path.join("apps", appName)],
        outputFile: `${appName}.md`,
      })
    }
  }

  return targets
}

async function main(): Promise<void> {
  const totalStart = performance.now()
  const targets = await resolveTargets()

  // Wipe and recreate context/ so removed apps never leave stale snapshots.
  await rm(CONTEXT_DIR, { recursive: true, force: true })
  await mkdir(CONTEXT_DIR, { recursive: true })

  log.info({ targets: targets.length }, "Syncing Repomix context snapshots...")

  for (const target of targets) {
    const targetStart = performance.now()
    const outputPath = path.join(CONTEXT_DIR, target.outputFile)

    const options: CliOptions = {
      config: CONFIG_PATH,
      output: outputPath,
      quiet: true,
    }

    const result = await runCli(target.directories, ROOT_DIR, options)
    const packResult = result?.packResult

    log.info(
      {
        output: `context/${target.outputFile}`,
        files: packResult?.totalFiles ?? 0,
        tokens: packResult?.totalTokens ?? 0,
        duration: formatDuration(performance.now() - targetStart),
      },
      `Packed ${target.label}`
    )
  }

  log.info(
    {
      generated: targets.length,
      duration: formatDuration(performance.now() - totalStart),
    },
    "All context files synced"
  )
}

main().catch((error: unknown) => {
  log.error({ err: error }, `Context sync failed: ${getErrorMessage(error)}`)
  process.exitCode = 1
})
