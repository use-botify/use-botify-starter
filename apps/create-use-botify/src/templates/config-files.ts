import { formatRunScript } from "../lib/package-manager"
import type { GeneratedFile, ScaffoldOptions } from "../types/cli.types"

export const BOTIFY_VERSIONS = Object.freeze({
  core: "^0.1.0",
  router: "^0.1.0",
  tooling: "^0.1.0",
  plugins: "^0.1.0",
  icons: "^1.0.0",
  grammy: "^1.38.0",
  zod: "^4.0.0",
  biome: "^2.0.0",
  typesNode: "^24.0.0",
  tsx: "^4.20.0",
  typescript: "^5.9.0",
  vite: "^6.3.0",
})

function sortRecord(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
  )
}

function renderPackageJson(options: ScaffoldOptions): string {
  const entryFile = options.useSrcDir ? "src/main.ts" : "main.ts"
  const needsPlugins =
    options.features.admin ||
    options.features.developer ||
    options.features.images

  const dependencies: Record<string, string> = {
    "@use-botify/core": BOTIFY_VERSIONS.core,
    "@use-botify/router": BOTIFY_VERSIONS.router,
    grammy: BOTIFY_VERSIONS.grammy,
    zod: BOTIFY_VERSIONS.zod,
  }

  const devDependencies: Record<string, string> = {
    "@biomejs/biome": BOTIFY_VERSIONS.biome,
    "@types/node": BOTIFY_VERSIONS.typesNode,
    tsx: BOTIFY_VERSIONS.tsx,
    typescript: BOTIFY_VERSIONS.typescript,
    vite: BOTIFY_VERSIONS.vite,
  }

  if (needsPlugins) {
    dependencies["@use-botify/plugins"] = BOTIFY_VERSIONS.plugins
  }

  if (options.features.developer) {
    dependencies["@use-botify/icons"] = BOTIFY_VERSIONS.icons
    // Developer icon commands persist the JSON/TS registry at runtime
    dependencies["@use-botify/tooling"] = BOTIFY_VERSIONS.tooling
  } else {
    devDependencies["@use-botify/tooling"] = BOTIFY_VERSIONS.tooling
  }

  const pkg = {
    name: options.packageName,
    version: "0.1.0",
    private: true,
    type: "module",
    engines: {
      node: ">=24.0.0",
    },
    scripts: {
      dev: `tsx ${entryFile}`,
      build: "tsc",
      start: "NODE_ENV=production node dist/main.js",
      typecheck: "tsc --noEmit",
      check: "biome check .",
      "check:fix": "biome check --write .",
    },
    dependencies: sortRecord(dependencies),
    devDependencies: sortRecord(devDependencies),
  }

  return `${JSON.stringify(pkg, null, 2)}\n`
}

function renderTsConfig(options: ScaffoldOptions): string {
  const pathTarget = options.useSrcDir ? "./src/*" : "./*"
  const include = options.useSrcDir
    ? ["src"]
    : ["main.ts", "env.ts", "lib", "features", "generated"]

  const tsconfig = {
    compilerOptions: {
      target: "ES2024",
      module: "ESNext",
      moduleResolution: "Bundler",
      lib: ["ES2024"],
      types: ["node"],
      strict: true,
      noUncheckedIndexedAccess: true,
      skipLibCheck: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      isolatedModules: true,
      outDir: "dist",
      ...(options.useSrcDir ? { rootDir: "src" } : {}),
      paths: {
        [options.importAlias]: [pathTarget],
      },
    },
    include,
    exclude: ["node_modules", "dist"],
  }

  return `${JSON.stringify(tsconfig, null, 2)}\n`
}

function renderBiomeJson(): string {
  const config = {
    formatter: {
      enabled: true,
      indentStyle: "space",
      indentWidth: 2,
    },
    linter: {
      enabled: true,
      rules: {
        recommended: true,
      },
    },
    javascript: {
      formatter: {
        semicolons: "asNeeded",
      },
    },
    files: {
      includes: ["**", "!dist", "!node_modules"],
    },
  }

  return `${JSON.stringify(config, null, 2)}\n`
}

function renderEnvExample(options: ScaffoldOptions): string {
  const lines = [
    "# Telegram Bot Token from @BotFather",
    "BOT_TOKEN=",
    "",
    "# Runtime environment (development | production)",
    "NODE_ENV=development",
  ]

  if (options.features.admin) {
    lines.push(
      "",
      "# Comma-separated Telegram user IDs allowed to access admin routes",
      "ADMIN_IDS="
    )
  }

  if (options.features.developer) {
    lines.push(
      "",
      "# Comma-separated Telegram user IDs allowed to access developer icon tools",
      "DEVELOPER_IDS="
    )
  }

  return `${lines.join("\n")}\n`
}

function renderGitignore(): string {
  return [
    "node_modules",
    "dist",
    ".env",
    ".env.local",
    "*.log",
    ".DS_Store",
    "",
  ].join("\n")
}

function renderReadme(options: ScaffoldOptions): string {
  const devCmd = formatRunScript(options.packageManager, "dev")
  const typecheckCmd = formatRunScript(options.packageManager, "typecheck")
  const buildCmd = formatRunScript(options.packageManager, "build")
  const rootPrefix = options.useSrcDir ? "src/" : ""

  const commandsList = [
    "- `/start` — Welcome message with interactive callback",
  ]
  if (options.features.admin) {
    commandsList.push("- `/panel` — Admin control panel (`ADMIN_IDS`)")
  }
  if (options.features.developer) {
    commandsList.push(
      "- `/add_icon`, `/list_icons`, `/remove_icon` — Custom Telegram emoji registry (`DEVELOPER_IDS`)"
    )
  }

  return [
    `# ${options.packageName}`,
    "",
    "Modular Telegram bot scaffolded with **create-use-botify** and powered by **grammY**.",
    "",
    "## Getting Started",
    "",
    "1. Copy `.env.example` to `.env` and fill in your `BOT_TOKEN` from `@BotFather`.",
    `2. Start development mode with hot feature reloading:`,
    "",
    "```bash",
    devCmd,
    "```",
    "",
    "## Scripts",
    "",
    `- \`${devCmd}\` — Run the bot with Vite HMR for \`${rootPrefix}features/\` and automatic route typegen`,
    `- \`${typecheckCmd}\` — Type-check the project with TypeScript`,
    `- \`${buildCmd}\` — Compile TypeScript to \`dist/\``,
    "",
    "## Included Commands",
    "",
    ...commandsList,
    "",
  ].join("\n")
}

export function renderConfigFiles(
  options: ScaffoldOptions
): readonly GeneratedFile[] {
  return [
    { path: "package.json", content: renderPackageJson(options) },
    { path: "tsconfig.json", content: renderTsConfig(options) },
    { path: "biome.json", content: renderBiomeJson() },
    { path: ".env.example", content: renderEnvExample(options) },
    { path: ".gitignore", content: renderGitignore() },
    { path: "README.md", content: renderReadme(options) },
  ]
}
