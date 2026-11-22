import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  CreateBotifyError,
  detectPackageManager,
  formatCliHelp,
  formatRunScript,
  getAliasPrefix,
  getInstallCommand,
  parseCliArgs,
  resolveScaffoldOptions,
  toValidPackageName,
  validateImportAlias,
  validateProjectName,
} from "../src/index"

describe("parseCliArgs", () => {
  it("parses positional project name and boolean/value flags", () => {
    const parsed = parseCliArgs([
      "my-telegram-bot",
      "--yes",
      "--no-src",
      "--alias",
      "~/",
      "--no-admin",
      "--developer",
      "--images",
      "--pm=bun",
      "--skip-install",
      "--no-git",
      "--overwrite",
    ])

    expect(parsed).toEqual({
      projectName: "my-telegram-bot",
      yes: true,
      help: false,
      version: false,
      useSrcDir: false,
      importAlias: "~/",
      admin: false,
      developer: true,
      images: true,
      packageManager: "bun",
      install: false,
      git: false,
      overwrite: true,
    })
  })

  it("supports shorthand package manager, help, and version flags", () => {
    expect(parseCliArgs(["-h"]).help).toBe(true)
    expect(parseCliArgs(["-v"]).version).toBe(true)
    expect(parseCliArgs(["--use-npm"]).packageManager).toBe("npm")
    expect(parseCliArgs(["--use-yarn"]).packageManager).toBe("yarn")
    expect(parseCliArgs(["--use-pnpm"]).packageManager).toBe("pnpm")
    expect(formatCliHelp()).toContain("Usage: create-use-botify")
  })

  it("throws CreateBotifyError on invalid flags, missing values, or extra positionals", () => {
    expect(() => parseCliArgs(["--unknown-flag"])).toThrow(CreateBotifyError)
    expect(() => parseCliArgs(["--alias"])).toThrow(CreateBotifyError)
    expect(() => parseCliArgs(["--pm", "cargo"])).toThrow(CreateBotifyError)
    expect(() => parseCliArgs(["bot-one", "bot-two"])).toThrow(
      CreateBotifyError
    )
  })
})

describe("package-manager & schema helpers", () => {
  it("detects invoking package manager and formats scripts", () => {
    expect(detectPackageManager("pnpm/12.14.0 npm/? node/v24.15.0")).toBe(
      "pnpm"
    )
    expect(detectPackageManager("npm/11.0.0 node/v24.15.0")).toBe("npm")
    expect(detectPackageManager("yarn/4.5.0 npm/?")).toBe("yarn")
    expect(detectPackageManager("bun/1.2.0")).toBe("bun")
    expect(detectPackageManager(undefined)).toBe("pnpm")

    expect(getInstallCommand("pnpm")).toEqual({
      command: "pnpm",
      args: ["install"],
    })
    expect(formatRunScript("pnpm", "dev")).toBe("pnpm dev")
    expect(formatRunScript("npm", "dev")).toBe("npm run dev")
  })

  it("validates and normalizes package names, aliases, and target paths", () => {
    expect(toValidPackageName("My Cool Bot!")).toBe("my-cool-bot")
    expect(toValidPackageName("@scope/my-bot")).toBe("@scope/my-bot")
    expect(toValidPackageName("...")).toBe("my-botify-bot")

    expect(validateProjectName("botify-app")).toBeUndefined()
    expect(validateProjectName("bad:name")).toBeDefined()

    expect(validateImportAlias("@/*")).toBeUndefined()
    expect(validateImportAlias("~/")).toBeUndefined()
    expect(validateImportAlias("src/*")).toBeDefined()
    expect(getAliasPrefix("@/*")).toBe("@/")

    const cwd = path.resolve("/tmp/workspace-root")
    const dotOptions = resolveScaffoldOptions({
      cwd,
      projectName: ".",
      importAlias: "~/",
      packageManager: "pnpm",
    })

    expect(dotOptions.targetDir).toBe(cwd)
    expect(dotOptions.packageName).toBe("workspace-root")
    expect(dotOptions.importAlias).toBe("~/*")
    expect(dotOptions.features).toEqual({
      admin: true,
      developer: true,
      images: false,
    })
  })
})
