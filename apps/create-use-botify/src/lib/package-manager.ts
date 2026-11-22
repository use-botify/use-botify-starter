import process from "node:process"

import type { PackageManager } from "../types/cli.types"

export const PACKAGE_MANAGERS = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
] as const satisfies readonly PackageManager[]

export function isPackageManager(value: string): value is PackageManager {
  return (PACKAGE_MANAGERS as readonly string[]).includes(value)
}

/**
 * Detects the invoking package manager from `npm_config_user_agent`,
 * falling back to `"pnpm"` when executed directly via Node.
 */
export function detectPackageManager(
  userAgent = process.env.npm_config_user_agent
): PackageManager {
  if (!userAgent) {
    return "pnpm"
  }

  const lower = userAgent.toLowerCase()
  if (lower.startsWith("pnpm/")) return "pnpm"
  if (lower.startsWith("yarn/")) return "yarn"
  if (lower.startsWith("bun/")) return "bun"
  if (lower.startsWith("npm/")) return "npm"

  return "pnpm"
}

/**
 * Returns the install command and argument list for a given package manager.
 */
export function getInstallCommand(pm: PackageManager): {
  readonly command: string
  readonly args: readonly string[]
} {
  return Object.freeze({
    command: pm,
    args: ["install"],
  })
}

/**
 * Formats a human-readable script invocation (e.g. `pnpm dev`, `npm run dev`).
 */
export function formatRunScript(pm: PackageManager, script: string): string {
  if (pm === "npm") {
    return `npm run ${script}`
  }

  return `${pm} ${script}`
}
