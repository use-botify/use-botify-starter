import { readdir } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import {
  cancel,
  confirm,
  intro,
  isCancel,
  multiselect,
  select,
  text,
} from "@clack/prompts"
import { hasErrorCode } from "@workspace/utils"
import chalk from "chalk"

import type {
  PackageManager,
  ParsedCliArgs,
  ScaffoldOptions,
} from "../types/cli.types"
import { CreateBotifyError } from "./errors"
import { detectPackageManager, PACKAGE_MANAGERS } from "./package-manager"
import {
  DEFAULT_IMPORT_ALIAS,
  DEFAULT_PROJECT_NAME,
  resolveScaffoldOptions,
  validateImportAlias,
  validateProjectName,
} from "./schema"

type OptionalFeatureKey = "admin" | "developer" | "images"

function unwrapPrompt<T>(value: T): Exclude<T, symbol> {
  if (isCancel(value)) {
    cancel("Scaffolding cancelled.")
    throw new CreateBotifyError(
      "PROMPT_CANCELLED",
      "Scaffolding cancelled by user."
    )
  }

  return value as Exclude<T, symbol>
}

async function isDirectoryNonEmpty(dirPath: string): Promise<boolean> {
  try {
    const entries = await readdir(dirPath)
    return entries.some((entry) => entry !== ".git")
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return false
    }
    throw error
  }
}

/**
 * Resolves `ScaffoldOptions` from parsed CLI arguments, prompting interactively
 * with `@clack/prompts` for any options not supplied via flags.
 */
export async function promptScaffoldOptions(
  args: ParsedCliArgs,
  cwd = process.cwd()
): Promise<ScaffoldOptions> {
  if (args.yes) {
    return resolveScaffoldOptions({
      cwd,
      projectName: args.projectName,
      useSrcDir: args.useSrcDir,
      importAlias: args.importAlias,
      admin: args.admin,
      developer: args.developer,
      images: args.images,
      packageManager: args.packageManager,
      install: args.install,
      git: args.git,
      overwrite: args.overwrite,
    })
  }

  intro(chalk.bgCyan.black.bold(" create-use-botify "))

  const projectName =
    args.projectName ??
    unwrapPrompt(
      await text({
        message: "Where should we create your Telegram bot?",
        placeholder: DEFAULT_PROJECT_NAME,
        defaultValue: DEFAULT_PROJECT_NAME,
        validate: (value) => validateProjectName(value ?? ""),
      })
    )

  const resolvedTargetDir =
    projectName.trim() === "."
      ? path.resolve(cwd)
      : path.resolve(cwd, projectName.trim())

  let overwrite = args.overwrite
  if (!overwrite && (await isDirectoryNonEmpty(resolvedTargetDir))) {
    const relativeTarget = path.relative(cwd, resolvedTargetDir) || "."
    const shouldOverwrite = unwrapPrompt(
      await confirm({
        message: `Directory "${relativeTarget}" is not empty. Continue and overwrite conflicting files?`,
        initialValue: false,
      })
    )

    if (!shouldOverwrite) {
      cancel("Scaffolding cancelled.")
      throw new CreateBotifyError(
        "TARGET_NOT_EMPTY",
        `Target directory "${resolvedTargetDir}" is not empty.`
      )
    }

    overwrite = true
  }

  const useSrcDir =
    args.useSrcDir ??
    unwrapPrompt(
      await confirm({
        message: "Use a src/ directory for bot source files?",
        initialValue: true,
      })
    )

  const importAlias =
    args.importAlias ??
    unwrapPrompt(
      await text({
        message: "What import alias would you like configured?",
        placeholder: DEFAULT_IMPORT_ALIAS,
        defaultValue: DEFAULT_IMPORT_ALIAS,
        validate: (value) => validateImportAlias(value ?? ""),
      })
    )

  let admin = args.admin
  let developer = args.developer
  let images = args.images

  if (admin === undefined || developer === undefined || images === undefined) {
    const initialValues: OptionalFeatureKey[] = []
    if (admin ?? true) initialValues.push("admin")
    if (developer ?? true) initialValues.push("developer")
    if (images ?? false) initialValues.push("images")

    const selected = unwrapPrompt(
      await multiselect<OptionalFeatureKey>({
        message: "Select optional features & plugins to include:",
        initialValues,
        required: false,
        options: [
          {
            value: "admin",
            label: "Admin panel",
            hint: "(admin)/panel feature + ADMIN_IDS guard",
          },
          {
            value: "developer",
            label: "Developer icon tools",
            hint: "(developer)/icons + @use-botify/icons & icon-tools",
          },
          {
            value: "images",
            label: "Image caching plugin",
            hint: "@use-botify/plugins/images manifest & file_id cache",
          },
        ],
      })
    )

    admin = selected.includes("admin")
    developer = selected.includes("developer")
    images = selected.includes("images")
  }

  const detectedPm = detectPackageManager()
  const packageManager =
    args.packageManager ??
    unwrapPrompt(
      await select<PackageManager>({
        message: "Which package manager do you want to use?",
        initialValue: detectedPm,
        options: PACKAGE_MANAGERS.map((pm) => ({
          value: pm,
          label: pm,
          hint: pm === detectedPm ? "detected" : undefined,
        })),
      })
    )

  const install =
    args.install ??
    unwrapPrompt(
      await confirm({
        message: `Install dependencies now with ${chalk.cyan(packageManager)}?`,
        initialValue: true,
      })
    )

  const git =
    args.git ??
    unwrapPrompt(
      await confirm({
        message: "Initialize a new git repository?",
        initialValue: true,
      })
    )

  return resolveScaffoldOptions({
    cwd,
    projectName,
    useSrcDir,
    importAlias,
    admin,
    developer,
    images,
    packageManager,
    install,
    git,
    overwrite,
  })
}
