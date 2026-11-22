import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  renderProjectFiles,
  resolveScaffoldOptions,
  scaffoldProject,
} from "../src/index"

interface GeneratedPackageJson {
  name: string
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

interface GeneratedTsConfig {
  compilerOptions: {
    rootDir?: string
    paths: Record<string, string[]>
  }
  include: string[]
}

const tempDirs: string[] = []

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "create-use-botify-test-"))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      await rm(dir, { recursive: true, force: true })
    }
  }
})

describe("renderProjectFiles", () => {
  it("renders default src/ layout with admin and developer features", () => {
    const options = resolveScaffoldOptions({
      cwd: "/tmp/projects",
      projectName: "demo-bot",
      packageManager: "pnpm",
    })

    const files = renderProjectFiles(options)
    const fileMap = new Map(files.map((file) => [file.path, file.content]))

    expect(fileMap.has("package.json")).toBe(true)
    expect(fileMap.has("tsconfig.json")).toBe(true)
    expect(fileMap.has("biome.json")).toBe(true)
    expect(fileMap.has(".env.example")).toBe(true)
    expect(fileMap.has(".gitignore")).toBe(true)
    expect(fileMap.has("src/main.ts")).toBe(true)
    expect(fileMap.has("src/env.ts")).toBe(true)
    expect(fileMap.has("src/lib/access.ts")).toBe(true)
    expect(fileMap.has("src/lib/icons.ts")).toBe(true)
    expect(fileMap.has("src/registry/icons.registry.json")).toBe(true)
    expect(fileMap.has("src/features/start/command.ts")).toBe(true)
    expect(fileMap.has("src/features/start/ping.callback.ts")).toBe(true)
    expect(fileMap.has("src/features/(admin)/panel/command.ts")).toBe(true)
    expect(fileMap.has("src/features/(developer)/add_icon/command.ts")).toBe(
      true
    )
    expect(fileMap.has("src/lib/images.ts")).toBe(false)

    const pkg = JSON.parse(
      fileMap.get("package.json") ?? "{}"
    ) as GeneratedPackageJson
    expect(pkg.name).toBe("demo-bot")
    expect(pkg.scripts.dev).toBe("tsx src/main.ts")
    expect(pkg.dependencies["@use-botify/core"]).toBeDefined()
    expect(pkg.dependencies["@use-botify/router"]).toBeDefined()
    expect(pkg.dependencies["@use-botify/plugins"]).toBeDefined()
    expect(pkg.dependencies["@use-botify/icons"]).toBeDefined()
    expect(pkg.dependencies["@use-botify/tooling"]).toBeDefined()

    const tsconfig = JSON.parse(
      fileMap.get("tsconfig.json") ?? "{}"
    ) as GeneratedTsConfig
    expect(tsconfig.compilerOptions.rootDir).toBe("src")
    expect(tsconfig.compilerOptions.paths).toEqual({ "@/*": ["./src/*"] })

    const envExample = fileMap.get(".env.example") ?? ""
    expect(envExample).toContain("ADMIN_IDS=")
    expect(envExample).toContain("DEVELOPER_IDS=")
  })

  it("renders minimal root-level layout with custom alias and zero unused optional files", () => {
    const options = resolveScaffoldOptions({
      cwd: "/tmp/projects",
      projectName: "lean-bot",
      useSrcDir: false,
      importAlias: "~/*",
      admin: false,
      developer: false,
      images: false,
      packageManager: "npm",
    })

    const files = renderProjectFiles(options)
    const fileMap = new Map(files.map((file) => [file.path, file.content]))

    expect(fileMap.has("main.ts")).toBe(true)
    expect(fileMap.has("env.ts")).toBe(true)
    expect(fileMap.has("features/start/command.ts")).toBe(true)
    expect(fileMap.has("lib/access.ts")).toBe(false)
    expect(fileMap.has("lib/icons.ts")).toBe(false)
    expect(fileMap.has("lib/images.ts")).toBe(false)

    const pkg = JSON.parse(
      fileMap.get("package.json") ?? "{}"
    ) as GeneratedPackageJson
    expect(pkg.scripts.dev).toBe("tsx main.ts")
    expect(pkg.dependencies["@use-botify/plugins"]).toBeUndefined()
    expect(pkg.dependencies["@use-botify/icons"]).toBeUndefined()
    expect(pkg.dependencies["@use-botify/tooling"]).toBeUndefined()
    expect(pkg.devDependencies["@use-botify/tooling"]).toBeDefined()

    const mainTs = fileMap.get("main.ts") ?? ""
    expect(mainTs).toContain('import { env } from "~/env"')
    expect(mainTs).toContain('aliasPrefix: "~/"')

    const tsconfig = JSON.parse(
      fileMap.get("tsconfig.json") ?? "{}"
    ) as GeneratedTsConfig
    expect(tsconfig.compilerOptions.rootDir).toBeUndefined()
    expect(tsconfig.compilerOptions.paths).toEqual({ "~/*": ["./*"] })
  })

  it("wires image caching plugin when images feature is enabled", () => {
    const options = resolveScaffoldOptions({
      cwd: "/tmp/projects",
      projectName: "media-bot",
      admin: false,
      developer: false,
      images: true,
    })

    const files = renderProjectFiles(options)
    const fileMap = new Map(files.map((file) => [file.path, file.content]))

    expect(fileMap.has("src/lib/images.ts")).toBe(true)
    expect(fileMap.has("assets/images/.gitkeep")).toBe(true)
    expect(fileMap.get("src/main.ts")).toContain("await images.load()")

    const pkg = JSON.parse(
      fileMap.get("package.json") ?? "{}"
    ) as GeneratedPackageJson
    expect(pkg.dependencies["@use-botify/plugins"]).toBeDefined()
  })
})

describe("scaffoldProject", () => {
  it("writes all files to disk and triggers lifecycle callbacks", async () => {
    const workspaceDir = await createTempDir()
    const options = resolveScaffoldOptions({
      cwd: workspaceDir,
      projectName: "fresh-bot",
      install: false,
      git: false,
    })

    const onFilesStart = vi.fn()
    const onFilesComplete = vi.fn()

    const result = await scaffoldProject(options, {
      onFilesStart,
      onFilesComplete,
    })

    expect(result.installed).toBe(false)
    expect(result.gitInitialized).toBe(false)
    expect(onFilesStart).toHaveBeenCalledWith(result.files.length)
    expect(onFilesComplete).toHaveBeenCalledWith(result.files.length)

    const writtenPkg = await readFile(
      path.join(options.targetDir, "package.json"),
      "utf8"
    )
    expect(JSON.parse(writtenPkg)).toMatchObject({ name: "fresh-bot" })
  })

  it("blocks non-empty target directories unless overwrite is enabled", async () => {
    const workspaceDir = await createTempDir()
    const existingDir = path.join(workspaceDir, "occupied-bot")
    await mkdir(existingDir, { recursive: true })
    await writeFile(path.join(existingDir, "existing.txt"), "keep", "utf8")

    const blockedOptions = resolveScaffoldOptions({
      cwd: workspaceDir,
      projectName: "occupied-bot",
      install: false,
      git: false,
      overwrite: false,
    })

    await expect(scaffoldProject(blockedOptions)).rejects.toMatchObject({
      name: "CreateBotifyError",
      code: "TARGET_NOT_EMPTY",
    })

    const overwriteOptions = resolveScaffoldOptions({
      cwd: workspaceDir,
      projectName: "occupied-bot",
      install: false,
      git: false,
      overwrite: true,
    })

    const result = await scaffoldProject(overwriteOptions)
    expect(result.files.length).toBeGreaterThan(0)
    expect(await readFile(path.join(existingDir, "existing.txt"), "utf8")).toBe(
      "keep"
    )
  })
})
