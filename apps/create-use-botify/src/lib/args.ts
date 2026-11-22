import type { PackageManager, ParsedCliArgs } from "../types/cli.types"
import { CreateBotifyError } from "./errors"
import { isPackageManager, PACKAGE_MANAGERS } from "./package-manager"

function readNextValue(
  argv: readonly string[],
  index: number,
  flag: string
): string {
  const next = argv[index + 1]
  if (!next || next.startsWith("-")) {
    throw new CreateBotifyError(
      "INVALID_CLI_ARGS",
      `Flag "${flag}" requires a value.`
    )
  }

  return next
}

function parsePackageManagerValue(raw: string): PackageManager {
  const normalized = raw.trim().toLowerCase()
  if (!isPackageManager(normalized)) {
    throw new CreateBotifyError(
      "INVALID_CLI_ARGS",
      `Unsupported package manager "${raw}". Expected one of: ${PACKAGE_MANAGERS.join(", ")}.`
    )
  }

  return normalized
}

/**
 * Parses `process.argv.slice(2)` into typed CLI flags without external parser dependencies.
 */
export function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  let projectName: string | undefined
  let yes = false
  let help = false
  let version = false
  let useSrcDir: boolean | undefined
  let importAlias: string | undefined
  let admin: boolean | undefined
  let developer: boolean | undefined
  let images: boolean | undefined
  let packageManager: PackageManager | undefined
  let install: boolean | undefined
  let git: boolean | undefined
  let overwrite = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg) {
      continue
    }

    if (arg === "-h" || arg === "--help") {
      help = true
      continue
    }

    if (arg === "-v" || arg === "--version") {
      version = true
      continue
    }

    if (arg === "-y" || arg === "--yes") {
      yes = true
      continue
    }

    if (arg === "--src") {
      useSrcDir = true
      continue
    }

    if (arg === "--no-src") {
      useSrcDir = false
      continue
    }

    if (arg === "--alias") {
      importAlias = readNextValue(argv, i, arg)
      i += 1
      continue
    }

    if (arg.startsWith("--alias=")) {
      importAlias = arg.slice("--alias=".length)
      continue
    }

    if (arg === "--admin") {
      admin = true
      continue
    }

    if (arg === "--no-admin") {
      admin = false
      continue
    }

    if (arg === "--developer") {
      developer = true
      continue
    }

    if (arg === "--no-developer") {
      developer = false
      continue
    }

    if (arg === "--images") {
      images = true
      continue
    }

    if (arg === "--no-images") {
      images = false
      continue
    }

    if (arg === "--pm" || arg === "--package-manager") {
      packageManager = parsePackageManagerValue(readNextValue(argv, i, arg))
      i += 1
      continue
    }

    if (arg.startsWith("--pm=")) {
      packageManager = parsePackageManagerValue(arg.slice("--pm=".length))
      continue
    }

    if (arg.startsWith("--package-manager=")) {
      packageManager = parsePackageManagerValue(
        arg.slice("--package-manager=".length)
      )
      continue
    }

    if (arg === "--use-pnpm") {
      packageManager = "pnpm"
      continue
    }

    if (arg === "--use-npm") {
      packageManager = "npm"
      continue
    }

    if (arg === "--use-yarn") {
      packageManager = "yarn"
      continue
    }

    if (arg === "--use-bun") {
      packageManager = "bun"
      continue
    }

    if (arg === "--install") {
      install = true
      continue
    }

    if (arg === "--no-install" || arg === "--skip-install") {
      install = false
      continue
    }

    if (arg === "--git") {
      git = true
      continue
    }

    if (arg === "--no-git") {
      git = false
      continue
    }

    if (arg === "--overwrite" || arg === "--force") {
      overwrite = true
      continue
    }

    if (arg.startsWith("-")) {
      throw new CreateBotifyError(
        "INVALID_CLI_ARGS",
        `Unknown flag "${arg}". Run with --help to see available options.`
      )
    }

    if (projectName !== undefined) {
      throw new CreateBotifyError(
        "INVALID_CLI_ARGS",
        `Unexpected extra positional argument "${arg}".`
      )
    }

    projectName = arg
  }

  return Object.freeze<ParsedCliArgs>({
    ...(projectName !== undefined ? { projectName } : {}),
    yes,
    help,
    version,
    ...(useSrcDir !== undefined ? { useSrcDir } : {}),
    ...(importAlias !== undefined ? { importAlias } : {}),
    ...(admin !== undefined ? { admin } : {}),
    ...(developer !== undefined ? { developer } : {}),
    ...(images !== undefined ? { images } : {}),
    ...(packageManager !== undefined ? { packageManager } : {}),
    ...(install !== undefined ? { install } : {}),
    ...(git !== undefined ? { git } : {}),
    overwrite,
  })
}

export function formatCliHelp(): string {
  return [
    "Usage: create-use-botify [project-name] [options]",
    "",
    "Options:",
    "  -y, --yes               Skip prompts and scaffold with defaults",
    "  --src / --no-src        Use a src/ directory (default: true)",
    '  --alias <pattern>       Import alias pattern (default: "@/*")',
    "  --admin / --no-admin    Include admin panel feature (default: true)",
    "  --developer / --no-developer",
    "                          Include developer icon tools feature (default: true)",
    "  --images / --no-images  Include disk-backed image caching plugin (default: false)",
    "  --pm <pm>               Package manager: pnpm, npm, yarn, or bun",
    "  --skip-install          Skip installing dependencies",
    "  --no-git                Skip git repository initialization",
    "  --overwrite             Allow scaffolding into a non-empty directory",
    "  -v, --version           Print CLI version",
    "  -h, --help              Show this help message",
  ].join("\n")
}
