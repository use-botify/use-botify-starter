import { defineConfig, type UserConfig } from "tsdown"

export { defineConfig, type UserConfig }

const BASE_CONFIG: UserConfig = {
  entry: ["src/index.ts"],
  outDir: "dist",
  format: "esm",
  target: "es2024",
  clean: true,
  fixedExtension: false,
}

function mergeConfig(base: UserConfig, overrides?: UserConfig): UserConfig {
  if (!overrides) {
    return base
  }

  return {
    ...base,
    ...overrides,
    ...(base.deps || overrides.deps
      ? {
          deps: {
            ...base.deps,
            ...overrides.deps,
          },
        }
      : {}),
  }
}

export function createLibraryConfig(overrides?: UserConfig): UserConfig {
  return defineConfig(
    mergeConfig(
      {
        ...BASE_CONFIG,
        platform: "neutral",
        dts: true,
      },
      overrides
    )
  )
}

export function createCliConfig(overrides?: UserConfig): UserConfig {
  return defineConfig(
    mergeConfig(
      {
        ...BASE_CONFIG,
        platform: "node",
        dts: false,
      },
      overrides
    )
  )
}
