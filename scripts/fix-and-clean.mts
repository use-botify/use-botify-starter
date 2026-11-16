import process from "node:process"

import { logger } from "@workspace/logger"
import spawn from "cross-spawn"

const LOGGER_CONTEXT = "FixAndClean"

type Step = {
  name: string
  command: string
  args: string[]
}

// Each step runs a root script, so package.json stays the single source of truth.
const steps: Step[] = [
  {
    name: "ESLint (with auto-fix)",
    command: "pnpm",
    args: ["run", "lint:fix"],
  },
  {
    name: "Prettier (format)",
    command: "pnpm",
    args: ["run", "format"],
  },
  {
    name: "TypeScript typecheck",
    command: "pnpm",
    args: ["run", "typecheck"],
  },
]

function main(): void {
  let passed = 0
  let failed = 0

  logger.info(LOGGER_CONTEXT, "Starting code quality checks.", {
    totalSteps: steps.length,
  })

  for (const [index, step] of steps.entries()) {
    logger.info(
      LOGGER_CONTEXT,
      `Step ${index + 1}/${steps.length}: ${step.name}`
    )

    try {
      const result = spawn.sync(step.command, step.args, { stdio: "inherit" })

      if (result.error) {
        logger.error(
          LOGGER_CONTEXT,
          `Failed to execute: ${step.name}`,
          result.error
        )
        failed++
        continue
      }

      if (result.status !== 0) {
        logger.error(LOGGER_CONTEXT, `Step failed: ${step.name}`, {
          exitCode: result.status,
          signal: result.signal,
        })
        failed++
        continue
      }

      passed++
      logger.info(LOGGER_CONTEXT, `Step passed: ${step.name}`)
    } catch (error: unknown) {
      logger.error(
        LOGGER_CONTEXT,
        `Unexpected error during: ${step.name}`,
        error
      )
      failed++
    }
  }

  logger.info(LOGGER_CONTEXT, "Code quality check summary.", {
    total: steps.length,
    passed,
    failed,
  })

  if (failed > 0) {
    logger.error(
      LOGGER_CONTEXT,
      "Some checks failed. Review the errors and fix remaining issues."
    )
    process.exitCode = 1
    return
  }

  logger.info(LOGGER_CONTEXT, "All checks passed successfully!")
}

main()
