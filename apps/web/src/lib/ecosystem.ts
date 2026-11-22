export type BotifyPackageKind = "cli" | "runtime" | "dev" | "plugin"

export type CliPackageManager = "pnpm" | "npm" | "bun" | "yarn"

export interface BotifyPackageMeta {
  readonly name: BotifyPackageName
  readonly shortName: string
  readonly kind: BotifyPackageKind
  readonly version: string
  readonly summary: string
  readonly installCommand: string
  readonly entrypoints: readonly string[]
  readonly npmUrl: string
  readonly githubUrl: string
}

export const BOTIFY_PACKAGES = [
  {
    name: "create-use-botify",
    shortName: "CLI",
    kind: "cli",
    version: "0.1.0",
    summary:
      "Interactive scaffolder for modular, Next.js-style grammY Telegram bots with Vite HMR.",
    installCommand: "pnpm create use-botify",
    entrypoints: ["create-use-botify", "create-use-botify/types"],
    npmUrl: "https://www.npmjs.com/package/create-use-botify",
    githubUrl:
      "https://github.com/use-botify/use-botify-starter/tree/main/apps/create-use-botify",
  },
  {
    name: "@use-botify/core",
    shortName: "core",
    kind: "runtime",
    version: "0.1.0",
    summary:
      "Bot runtime, structured logger, graceful shutdown lifecycle, and HMR middleware dispatcher.",
    installCommand: "pnpm add @use-botify/core grammy",
    entrypoints: [
      "@use-botify/core",
      "@use-botify/core/middleware",
      "@use-botify/core/types",
    ],
    npmUrl: "https://www.npmjs.com/package/@use-botify/core",
    githubUrl:
      "https://github.com/use-botify/use-botify-starter/tree/main/packages/core",
  },
  {
    name: "@use-botify/router",
    shortName: "router",
    kind: "runtime",
    version: "0.1.0",
    summary:
      "File-based features/ router with (tier) route groups, dynamic [param] callbacks, and menu sync.",
    installCommand: "pnpm add @use-botify/router grammy",
    entrypoints: [
      "@use-botify/router",
      "@use-botify/router/fs",
      "@use-botify/router/types",
    ],
    npmUrl: "https://www.npmjs.com/package/@use-botify/router",
    githubUrl:
      "https://github.com/use-botify/use-botify-starter/tree/main/packages/router",
  },
  {
    name: "@use-botify/tooling",
    shortName: "tooling",
    kind: "dev",
    version: "0.1.0",
    summary:
      "Vite SSR feature hot-reloading, Next.js-style routes.d.ts typegen, and atomic icon registry codegen.",
    installCommand: "pnpm add -D @use-botify/tooling vite",
    entrypoints: [
      "@use-botify/tooling",
      "@use-botify/tooling/hmr",
      "@use-botify/tooling/codegen",
      "@use-botify/tooling/types",
    ],
    npmUrl: "https://www.npmjs.com/package/@use-botify/tooling",
    githubUrl:
      "https://github.com/use-botify/use-botify-starter/tree/main/packages/tooling",
  },
  {
    name: "@use-botify/plugins",
    shortName: "plugins",
    kind: "plugin",
    version: "0.1.0",
    summary:
      "Optional runtime plugins: magic-byte image file_id caching, HTML UI panels, and custom emoji tools.",
    installCommand: "pnpm add @use-botify/plugins grammy",
    entrypoints: [
      "@use-botify/plugins",
      "@use-botify/plugins/images",
      "@use-botify/plugins/panels",
      "@use-botify/plugins/icon-tools",
      "@use-botify/plugins/types",
    ],
    npmUrl: "https://www.npmjs.com/package/@use-botify/plugins",
    githubUrl:
      "https://github.com/use-botify/use-botify-starter/tree/main/packages/plugins",
  },
  {
    name: "@use-botify/icons",
    shortName: "icons",
    kind: "plugin",
    version: "1.0.0",
    summary:
      "Typed Telegram custom emoji registry, smart icon objects, and inline keyboard button builders.",
    installCommand: "pnpm add @use-botify/icons",
    entrypoints: ["@use-botify/icons"],
    npmUrl: "https://www.npmjs.com/package/@use-botify/icons",
    githubUrl:
      "https://github.com/use-botify/use-botify-starter/tree/main/packages/icons",
  },
] as const

export type BotifyPackageName = (typeof BOTIFY_PACKAGES)[number]["name"]

export const TRACKED_PACKAGES: readonly BotifyPackageName[] =
  BOTIFY_PACKAGES.map((pkg) => pkg.name)

export const CLI_COMMANDS: Readonly<Record<CliPackageManager, string>> = {
  pnpm: "pnpm create use-botify",
  npm: "npx create-use-botify@latest",
  bun: "bun create use-botify",
  yarn: "yarn create use-botify",
}
