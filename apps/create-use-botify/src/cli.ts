#!/usr/bin/env node

import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { intro, log, note, outro, spinner } from "@clack/prompts"
import { getErrorMessage } from "@workspace/utils"
import chalk from "chalk"

import { formatCliHelp, parseCliArgs } from "./lib/args"
import { CreateBotifyError } from "./lib/errors"
import { formatRunScript, getInstallCommand } from "./lib/package-manager"
import { promptScaffoldOptions } from "./lib/prompts"
import { scaffoldProject } from "./lib/scaffold"

async function readCliVersion(): Promise<string> {
  try {
    const pkgUrl = new URL("../package.json", import.meta.url)
    const raw = await readFile(pkgUrl, "utf8")
    const parsed = JSON.parse(raw) as { version?: unknown }
    return typeof parsed.version === "string" ? parsed.version : "0.0.0"
  } catch {
    return "0.0.0"
  }
}

function buildNextSteps(
  cwd: string,
  targetDir: string,
  packageManager: "pnpm" | "npm" | "yarn" | "bun",
  installed: boolean
): string {
  const steps: string[] = []
  const relativeDir = path.relative(cwd, targetDir)

  if (relativeDir.length > 0 && relativeDir !== ".") {
    steps.push(`cd ${relativeDir}`)
  }

  if (!installed) {
    const { command, args } = getInstallCommand(packageManager)
    steps.push(`${command} ${args.join(" ")}`)
  }

  steps.push(
    process.platform === "win32"
      ? "copy .env.example .env"
      : "cp .env.example .env"
  )
  steps.push("# Add your BOT_TOKEN from @BotFather to .env")
  steps.push(formatRunScript(packageManager, "dev"))

  return steps.join("\n")
}

async function main(): Promise<void> {
  const cwd = process.cwd()
  const args = parseCliArgs(process.argv.slice(2))

  if (args.help) {
    console.log(formatCliHelp())
    return
  }

  if (args.version) {
    const version = await readCliVersion()
    console.log(`create-use-botify v${version}`)
    return
  }

  const options = await promptScaffoldOptions(args, cwd)

  if (args.yes) {
    intro(chalk.bgCyan.black.bold(" create-use-botify "))
  }

  const progress = spinner()
  const warnings: string[] = []

  const result = await scaffoldProject(options, {
    onFilesStart: (count) => {
      progress.start(`Creating ${count} project files...`)
    },
    onFilesComplete: (count) => {
      progress.stop(`Created ${count} project files`)
    },
    onGitStart: () => {
      progress.start("Initializing git repository...")
    },
    onGitComplete: (initialized) => {
      progress.stop(
        initialized ? "Initialized git repository" : "Skipped git repository"
      )
    },
    onInstallStart: (pm) => {
      progress.start(`Installing dependencies with ${pm}...`)
    },
    onInstallComplete: (installed) => {
      progress.stop(
        installed
          ? `Installed dependencies with ${options.packageManager}`
          : "Dependency installation skipped"
      )
    },
    onWarning: (message) => {
      warnings.push(message)
    },
  })

  for (const warning of warnings) {
    log.warn(chalk.yellow(warning))
  }

  const nextSteps = buildNextSteps(
    cwd,
    result.options.targetDir,
    result.options.packageManager,
    result.installed
  )

  note(nextSteps, "Next steps")
  outro(chalk.green(`Bot "${result.options.packageName}" is ready!`))
}

try {
  await main()
} catch (error: unknown) {
  if (error instanceof CreateBotifyError && error.code === "PROMPT_CANCELLED") {
    process.exit(0)
  }

  log.error(chalk.red(getErrorMessage(error)))
  process.exit(1)
}
