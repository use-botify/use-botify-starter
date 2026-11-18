import path from "node:path"
import process from "node:process"

import { createLogger } from "@workspace/logger"
import { formatDuration, getErrorMessage } from "@workspace/utils"
import spawn from "cross-spawn"

interface MaintenanceTask {
  label: string
  command: string
  args: string[]
}

const ROOT_DIR = path.resolve(import.meta.dirname, "..")
const log = createLogger({ name: "check-all" })

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: "inherit",
    })

    child.on("error", (error) => {
      reject(error)
    })

    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      const reason = signal
        ? `terminated by signal ${signal}`
        : `exited with code ${code ?? "unknown"}`
      reject(new Error(`Command "${command} ${args.join(" ")}" ${reason}`))
    })
  })
}

async function main(): Promise<void> {
  const totalStart = performance.now()
  const includeDocs = process.argv.includes("--docs")

  const tasks: MaintenanceTask[] = [
    {
      label: "Biome format & lint",
      command: "pnpm",
      args: ["check:fix"],
    },
    {
      label: "TypeScript typecheck",
      command: "pnpm",
      args: ["typecheck"],
    },
  ]

  if (includeDocs) {
    tasks.push({
      label: "Repomix context sync",
      command: "pnpm",
      args: ["script:generate:docs"],
    })
  }

  log.info({ steps: tasks.length }, "Running repository checks...")

  for (const task of tasks) {
    const stepStart = performance.now()
    log.info(`Starting: ${task.label}`)

    await runCommand(task.command, task.args)

    log.info(
      { duration: formatDuration(performance.now() - stepStart) },
      `Passed: ${task.label}`
    )
  }

  log.info(
    { duration: formatDuration(performance.now() - totalStart) },
    "All repository checks passed"
  )
}

main().catch((error: unknown) => {
  log.error({ err: error }, `Check failed: ${getErrorMessage(error)}`)
  process.exitCode = 1
})
