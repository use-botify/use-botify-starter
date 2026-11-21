import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  createIconRegistryStore,
  formatTsLiteral,
  generateIconRegistryTs,
  generateRouteTypes,
  isStoredIconEntry,
  writeFileIfChanged,
  writeRouteTypes,
} from "../src/codegen"
import { BotifyToolingError } from "../src/index"

const tempDirs: string[] = []

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "botify-tooling-codegen-"))
  tempDirs.push(dir)
  return dir
}

async function writeFixture(
  rootDir: string,
  relativePath: string,
  content: string
): Promise<string> {
  const fullPath = path.join(rootDir, relativePath)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, "utf8")
  return fullPath
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      await rm(dir, { recursive: true, force: true })
    }
  }
})

describe("fs-utils & formatTsLiteral", () => {
  it("formats deterministic TS literals and skips redundant writes", async () => {
    const formatted = formatTsLiteral({
      validKey: "ok",
      "kebab-key": [1, true, null],
      emptyObj: {},
      emptyArr: [],
      ignored: undefined,
    })

    expect(formatted).toContain('validKey: "ok",')
    expect(formatted).toContain('"kebab-key": [')
    expect(formatted).not.toContain("ignored")

    const dir = await createTempDir()
    const target = path.join(dir, "nested", "sample.txt")

    const first = await writeFileIfChanged(target, "hello")
    const second = await writeFileIfChanged(target, "hello")
    const third = await writeFileIfChanged(target, "updated")

    expect(first.written).toBe(true)
    expect(second.written).toBe(false)
    expect(third.written).toBe(true)
    expect(await readFile(target, "utf8")).toBe("updated")
  })
})

describe("route typegen", () => {
  it("generates typed feature, command, access, and dynamic callback maps", () => {
    const output = generateRouteTypes([
      {
        kind: "command",
        relativePath: "start/command.ts",
        featureName: "start",
        access: "public",
        commandName: "start",
      },
      {
        kind: "command",
        relativePath: "(admin)/panel/command.ts",
        featureName: "panel",
        access: "admin",
        commandName: "panel",
      },
      {
        kind: "callback",
        relativePath: "order/[orderId]/confirm.callback.ts",
        featureName: "order",
        access: "public",
        callbackPattern: "order:[orderId]:confirm",
      },
      {
        kind: "callback",
        relativePath: "start/callback.ts",
        featureName: "start",
        access: "public",
        callbackPattern: "start:callback",
      },
    ])

    expect(output).toContain("export type BotifyFeatureName =")
    expect(output).toContain('| "order"')
    expect(output).toContain('| "panel"')
    expect(output).toContain('| "start"')
    expect(output).toContain(
      'readonly "order:[orderId]:confirm": { readonly orderId: string }'
    )
    expect(output).toContain(
      'readonly "start:callback": Readonly<Record<string, never>>'
    )
  })

  it("discovers routes on disk and writes declarations only when changed", async () => {
    const dir = await createTempDir()
    const featuresDir = path.join(dir, "features")
    const outputPath = path.join(dir, "generated", "routes.d.ts")

    await writeFixture(
      featuresDir,
      "start/command.ts",
      "export default () => {}"
    )
    await writeFixture(
      featuresDir,
      "order/[id]/callback.ts",
      "export default () => {}"
    )

    const first = await writeRouteTypes({
      featuresDir,
      outputPath,
      logger: false,
    })
    const second = await writeRouteTypes({
      featuresDir,
      outputPath,
      logger: false,
    })

    expect(first.written).toBe(true)
    expect(second.written).toBe(false)
    expect(first.counts).toEqual({
      features: 2,
      commands: 1,
      callbacks: 1,
    })

    const content = await readFile(outputPath, "utf8")
    expect(content).toContain('"order:[id]"')
    expect(content).toContain('"start"')
  })
})

describe("icon registry store & TS codegen", () => {
  it("validates entries, persists JSON + TS atomically, and reloads cleanly", async () => {
    const dir = await createTempDir()
    const jsonPath = path.join(dir, "registry", "icons.registry.json")
    const tsPath = path.join(dir, "registry", "icons.registry.ts")

    expect(
      isStoredIconEntry({
        key: "chat",
        customEmojiId: "5443038326535759644",
        fallback: "💬",
      })
    ).toBe(true)
    expect(
      isStoredIconEntry({
        key: "bad",
        customEmojiId: "not-numeric",
        fallback: "❌",
      })
    ).toBe(false)

    const store = createIconRegistryStore({
      jsonPath,
      tsPath,
      exportName: "BOT_ICONS",
      logger: false,
    })

    // First load on ENOENT seeds empty JSON + TS files
    const seeded = await store.load()
    expect(seeded).toEqual({})

    store.set("swap", {
      key: "swap",
      customEmojiId: "999000111222333444",
      fallback: "🔁",
      capturedAt: "2026-11-21T00:00:00.000Z",
    })
    expect(store.size).toBe(1)
    expect(store.has("swap")).toBe(true)
    expect(store.get("swap")?.fallback).toBe("🔁")

    const persisted = await store.persist()
    expect(persisted.count).toBe(1)
    expect(persisted.json.written).toBe(true)
    expect(persisted.ts?.written).toBe(true)

    // Identical persist skips both writes
    const repeated = await store.persist()
    expect(repeated.json.written).toBe(false)
    expect(repeated.ts?.written).toBe(false)

    const tsContent = await readFile(tsPath, "utf8")
    expect(tsContent).toContain("export const BOT_ICONS =")
    expect(tsContent).toContain('customEmojiId: "999000111222333444"')

    // Fresh store loads persisted JSON cleanly
    const reloaded = createIconRegistryStore({ jsonPath, logger: false })
    const loadedIcons = await reloaded.load()
    expect(loadedIcons.swap?.customEmojiId).toBe("999000111222333444")
    expect(reloaded.remove("swap")).toBe(true)
    expect(reloaded.size).toBe(0)
  })

  it("rejects malformed icon entries and invalid export names", async () => {
    const dir = await createTempDir()
    const badJsonPath = await writeFixture(
      dir,
      "bad.json",
      JSON.stringify({
        broken: { key: "broken", customEmojiId: "abc", fallback: "🔥" },
      })
    )

    const store = createIconRegistryStore({
      jsonPath: badJsonPath,
      logger: false,
    })

    await expect(store.load()).rejects.toMatchObject({
      name: "BotifyToolingError",
      code: "INVALID_ICON_REGISTRY",
    })

    expect(() =>
      generateIconRegistryTs({}, { exportName: "123-invalid" })
    ).toThrow(BotifyToolingError)
  })
})
