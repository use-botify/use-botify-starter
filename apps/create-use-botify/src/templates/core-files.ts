import { getAliasPrefix } from "../lib/schema"
import type { GeneratedFile, ScaffoldOptions } from "../types/cli.types"

function withSourcePrefix(options: ScaffoldOptions, filePath: string): string {
  return options.useSrcDir ? `src/${filePath}` : filePath
}

function renderEnvFile(options: ScaffoldOptions): string {
  const needsIdParser = options.features.admin || options.features.developer
  const lines: string[] = [
    'import process from "node:process"',
    "",
    'import { z } from "zod"',
    "",
    "// Load .env natively on Node.js >=24 without extra dependencies",
    "try {",
    "  process.loadEnvFile()",
    "} catch {",
    "  // Ignore when .env does not exist (e.g. environment injected by host)",
    "}",
    "",
  ]

  if (needsIdParser) {
    lines.push(
      "const idListSchema = z",
      "  .string()",
      "  .optional()",
      '  .default("")',
      "  .transform((raw) =>",
      "    raw",
      '      .split(",")',
      "      .map((item) => item.trim())",
      "      .filter((item) => item.length > 0)",
      "      .map((item) => Number(item))",
      "      .filter((id) => Number.isSafeInteger(id) && id > 0)",
      "  )",
      ""
    )
  }

  lines.push(
    "const envSchema = z.object({",
    '  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required in .env"),',
    '  NODE_ENV: z.enum(["development", "production"]).default("development"),'
  )

  if (options.features.admin) {
    lines.push("  ADMIN_IDS: idListSchema,")
  }

  if (options.features.developer) {
    lines.push("  DEVELOPER_IDS: idListSchema,")
  }

  lines.push(
    "})",
    "",
    "export const env = envSchema.parse(process.env)",
    "export type Env = z.infer<typeof envSchema>",
    ""
  )

  return lines.join("\n")
}

function renderAccessFile(options: ScaffoldOptions): string {
  const alias = getAliasPrefix(options.importAlias)
  const lines: string[] = [`import { env } from "${alias}env"`, ""]

  if (options.features.admin) {
    lines.push("const adminIdSet = new Set<number>(env.ADMIN_IDS)")
  }

  if (options.features.developer) {
    lines.push("const developerIdSet = new Set<number>(env.DEVELOPER_IDS)")
  }

  lines.push("")

  if (options.features.admin) {
    const devFallback = options.features.developer
      ? " || developerIdSet.has(userId)"
      : ""
    lines.push(
      "export function isAdmin(userId?: number): boolean {",
      `  return userId !== undefined && (adminIdSet.has(userId)${devFallback})`,
      "}",
      ""
    )
  }

  if (options.features.developer) {
    lines.push(
      "export function isDeveloper(userId?: number): boolean {",
      "  return userId !== undefined && developerIdSet.has(userId)",
      "}",
      ""
    )
  }

  return lines.join("\n")
}

function renderIconsFile(options: ScaffoldOptions): string {
  const registryBase = options.useSrcDir ? "src/registry" : "registry"

  return [
    'import path from "node:path"',
    'import process from "node:process"',
    "",
    'import { createIconToolsPlugin } from "@use-botify/plugins/icon-tools"',
    'import { createIconRegistryStore } from "@use-botify/tooling/codegen"',
    "",
    "export const iconStore = createIconRegistryStore({",
    `  jsonPath: path.resolve(process.cwd(), "${registryBase}/icons.registry.json"),`,
    `  tsPath: path.resolve(process.cwd(), "${registryBase}/icons.registry.ts"),`,
    "})",
    "",
    "export const iconTools = createIconToolsPlugin({",
    "  store: iconStore,",
    "})",
    "",
  ].join("\n")
}

function renderImagesFile(): string {
  return [
    'import path from "node:path"',
    'import process from "node:process"',
    "",
    'import { createImagePlugin } from "@use-botify/plugins/images"',
    "",
    "export const images = createImagePlugin({",
    '  assetsDir: path.resolve(process.cwd(), "assets/images"),',
    "  manifest: {",
    '    // welcome: "welcome.png",',
    "  },",
    "})",
    "",
  ].join("\n")
}

function renderMainFile(options: ScaffoldOptions): string {
  const alias = getAliasPrefix(options.importAlias)
  const routeTypesPath = options.useSrcDir
    ? "src/generated/routes.d.ts"
    : "generated/routes.d.ts"

  const imports: string[] = [
    'import path from "node:path"',
    'import process from "node:process"',
    "",
    'import { createBot } from "@use-botify/core"',
    'import { createHmrDispatcher } from "@use-botify/core/middleware"',
    'import { createFsRouter } from "@use-botify/router/fs"',
    "",
    `import { env } from "${alias}env"`,
  ]

  if (options.features.developer) {
    imports.push(`import { iconStore } from "${alias}lib/icons"`)
  }

  if (options.features.images) {
    imports.push(`import { images } from "${alias}lib/images"`)
  }

  const startupCalls: string[] = []
  if (options.features.developer) {
    startupCalls.push("  await iconStore.load()")
  }
  if (options.features.images) {
    startupCalls.push("  await images.load()")
  }

  return [
    ...imports,
    "",
    "async function bootstrap(): Promise<void> {",
    "  const app = createBot({ token: env.BOT_TOKEN })",
    "  const sourceDir = import.meta.dirname",
    '  const featuresDir = path.resolve(sourceDir, "features")',
    ...(startupCalls.length > 0 ? ["", ...startupCalls] : []),
    "",
    '  if (env.NODE_ENV === "development") {',
    "    const hmr = createHmrDispatcher({ logger: app.logger })",
    "    app.use(hmr.middleware)",
    "",
    "    const [{ startFeatureHmr }, { writeRouteTypes }] = await Promise.all([",
    '      import("@use-botify/tooling/hmr"),',
    '      import("@use-botify/tooling/codegen"),',
    "    ])",
    "",
    "    const watcher = await startFeatureHmr({",
    "      projectRoot: process.cwd(),",
    "      sourceDir,",
    "      featuresDir,",
    `      aliasPrefix: ${JSON.stringify(alias)},`,
    "      logger: app.logger,",
    "      onReload: async ({ loadModule }) => {",
    "        const router = await createFsRouter({",
    "          featuresDir,",
    "          loadModule,",
    "          logger: app.logger,",
    "        })",
    "",
    "        hmr.replace(router.composer)",
    "",
    "        await writeRouteTypes({",
    "          featuresDir,",
    `          outputPath: path.resolve(process.cwd(), "${routeTypesPath}"),`,
    "          logger: app.logger,",
    "        })",
    "      },",
    "    })",
    "",
    "    app.onShutdown(() => watcher.close())",
    "  } else {",
    "    const router = await createFsRouter({",
    "      featuresDir,",
    "      logger: app.logger,",
    "    })",
    "    app.use(router.composer)",
    "  }",
    "",
    "  await app.start()",
    "}",
    "",
    "await bootstrap()",
    "",
  ].join("\n")
}

export function renderCoreFiles(
  options: ScaffoldOptions
): readonly GeneratedFile[] {
  const files: GeneratedFile[] = [
    {
      path: withSourcePrefix(options, "env.ts"),
      content: renderEnvFile(options),
    },
    {
      path: withSourcePrefix(options, "main.ts"),
      content: renderMainFile(options),
    },
  ]

  if (options.features.admin || options.features.developer) {
    files.push({
      path: withSourcePrefix(options, "lib/access.ts"),
      content: renderAccessFile(options),
    })
  }

  if (options.features.developer) {
    files.push(
      {
        path: withSourcePrefix(options, "lib/icons.ts"),
        content: renderIconsFile(options),
      },
      {
        path: withSourcePrefix(options, "registry/icons.registry.json"),
        content: "{}\n",
      }
    )
  }

  if (options.features.images) {
    files.push(
      {
        path: withSourcePrefix(options, "lib/images.ts"),
        content: renderImagesFile(),
      },
      {
        path: "assets/images/.gitkeep",
        content: "",
      }
    )
  }

  return files
}
