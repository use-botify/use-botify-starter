import path from "node:path"
import process from "node:process"

import { z } from "zod"

import type { PackageManager, ScaffoldOptions } from "../types/cli.types"
import { CreateBotifyError } from "./errors"
import { detectPackageManager, PACKAGE_MANAGERS } from "./package-manager"

export const DEFAULT_PROJECT_NAME = "my-botify-bot"
export const DEFAULT_IMPORT_ALIAS = "@/*"

const NPM_PACKAGE_NAME_PATTERN =
  /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
const IMPORT_ALIAS_PATTERN = /^[@~#$%][A-Za-z0-9_-]*\/\*$/

export const packageManagerSchema = z.enum(PACKAGE_MANAGERS)

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name cannot be empty.")
  .refine(
    (value) => !/[<>:"|?*\0]/.test(value),
    'Project name contains invalid filesystem characters (< > : " | ? *).'
  )

export const importAliasSchema = z
  .string()
  .trim()
  .transform((value) => (value.endsWith("/") ? `${value}*` : value))
  .refine(
    (value) => IMPORT_ALIAS_PATTERN.test(value),
    'Import alias must match a prefix pattern like "@/*", "~/*", or "#/*".'
  )

export const featureSelectionSchema = z.object({
  admin: z.boolean(),
  developer: z.boolean(),
  images: z.boolean(),
})

export const scaffoldOptionsSchema = z.object({
  projectName: projectNameSchema,
  packageName: z
    .string()
    .regex(NPM_PACKAGE_NAME_PATTERN, "Invalid npm package name."),
  targetDir: z.string().min(1),
  useSrcDir: z.boolean(),
  importAlias: importAliasSchema,
  features: featureSelectionSchema,
  packageManager: packageManagerSchema,
  install: z.boolean(),
  git: z.boolean(),
  overwrite: z.boolean(),
})

/**
 * Converts an arbitrary directory or project name into a valid npm package name.
 */
export function toValidPackageName(rawName: string): string {
  const trimmed = rawName.trim()

  if (NPM_PACKAGE_NAME_PATTERN.test(trimmed)) {
    return trimmed
  }

  const normalized = trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]+/, "")
    .replace(/[^a-z0-9-~]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized.length > 0 ? normalized : DEFAULT_PROJECT_NAME
}

/**
 * Validates a project name string for interactive prompts, returning an error
 * message string on failure or `undefined` when valid.
 */
export function validateProjectName(value: string): string | undefined {
  const result = projectNameSchema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

/**
 * Validates an import alias string for interactive prompts, returning an error
 * message string on failure or `undefined` when valid.
 */
export function validateImportAlias(value: string): string | undefined {
  const result = importAliasSchema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

/**
 * Extracts the bare prefix from an import alias (e.g. `"@/*"` → `"@/"`).
 */
export function getAliasPrefix(importAlias: string): string {
  return importAlias.endsWith("*") ? importAlias.slice(0, -1) : importAlias
}

export interface ResolveScaffoldOptionsInput {
  readonly cwd?: string
  readonly projectName?: string
  readonly useSrcDir?: boolean
  readonly importAlias?: string
  readonly admin?: boolean
  readonly developer?: boolean
  readonly images?: boolean
  readonly packageManager?: PackageManager
  readonly install?: boolean
  readonly git?: boolean
  readonly overwrite?: boolean
}

/**
 * Normalizes and validates partial inputs into a frozen `ScaffoldOptions` object.
 */
export function resolveScaffoldOptions(
  input: ResolveScaffoldOptionsInput
): ScaffoldOptions {
  const cwd = path.resolve(input.cwd ?? process.cwd())
  const projectName = (input.projectName ?? DEFAULT_PROJECT_NAME).trim()
  const targetDir = projectName === "." ? cwd : path.resolve(cwd, projectName)
  const rawPackageName =
    projectName === "." ? path.basename(cwd) : path.basename(targetDir)
  const packageName = toValidPackageName(rawPackageName)

  const parsed = scaffoldOptionsSchema.safeParse({
    projectName,
    packageName,
    targetDir,
    useSrcDir: input.useSrcDir ?? true,
    importAlias: input.importAlias ?? DEFAULT_IMPORT_ALIAS,
    features: {
      admin: input.admin ?? true,
      developer: input.developer ?? true,
      images: input.images ?? false,
    },
    packageManager: input.packageManager ?? detectPackageManager(),
    install: input.install ?? true,
    git: input.git ?? true,
    overwrite: input.overwrite ?? false,
  })

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message).join(" ")
    throw new CreateBotifyError("INVALID_OPTIONS", details)
  }

  return Object.freeze<ScaffoldOptions>({
    ...parsed.data,
    features: Object.freeze({ ...parsed.data.features }),
  })
}
