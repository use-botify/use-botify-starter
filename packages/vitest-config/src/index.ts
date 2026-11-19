import { resolve } from "node:path"

import {
  configDefaults,
  defineConfig,
  mergeConfig,
  type ViteUserConfig,
} from "vitest/config"

const BASE_EXCLUDE = [...configDefaults.exclude, "**/dist/**", "**/.turbo/**"]

function createBaseConfig(overrides: ViteUserConfig = {}): ViteUserConfig {
  const rootDir = overrides.root ?? process.cwd()

  const base: ViteUserConfig = {
    resolve: {
      alias: {
        "@": resolve(rootDir, "src"),
      },
    },
    test: {
      environment: "node",
      include: [
        "src/**/*.{test,spec}.{ts,tsx,mts}",
        "tests/**/*.{test,spec}.{ts,tsx,mts}",
      ],
      exclude: BASE_EXCLUDE,
      restoreMocks: true,
      passWithNoTests: false,
    },
  }

  return defineConfig(mergeConfig(base, overrides))
}

/**
 * Shared Vitest preset for Node apps, bots, and CLIs.
 */
export function createNodeTestConfig(
  overrides: ViteUserConfig = {}
): ViteUserConfig {
  return createBaseConfig(overrides)
}

/**
 * Shared Vitest preset for publishable TypeScript libraries (`@use-botify/*`).
 */
export function createLibraryTestConfig(
  overrides: ViteUserConfig = {}
): ViteUserConfig {
  return createBaseConfig(
    mergeConfig(
      {
        test: {
          coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts", "src/**/types.ts", "src/**/*.types.ts"],
          },
        },
      } satisfies ViteUserConfig,
      overrides
    )
  )
}

export { configDefaults, defineConfig, mergeConfig, type ViteUserConfig }
