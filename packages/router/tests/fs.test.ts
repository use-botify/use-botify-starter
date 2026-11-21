import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { Bot } from "grammy"
import type { Update, UserFromGetMe } from "grammy/types"
import { afterEach, describe, expect, it } from "vitest"

import { createFsRouter, discoverRoutes, loadFeatures } from "../src/fs"

const VALID_TOKEN = "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi"

const MOCK_BOT_INFO: UserFromGetMe = {
  id: 123456789,
  is_bot: true,
  first_name: "Botify FS",
  username: "botify_fs_bot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  can_manage_bots: false,
  supports_join_request_queries: false,
}

const tempDirs: string[] = []

async function createTempFeaturesDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "botify-router-fs-"))
  tempDirs.push(dir)
  return dir
}

async function writeRouteFile(
  rootDir: string,
  relativePath: string,
  content: string
): Promise<void> {
  const fullPath = path.join(rootDir, relativePath)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, "utf8")
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      await rm(dir, { recursive: true, force: true })
    }
  }
})

describe("discoverRoutes", () => {
  it("infers commands, dynamic callbacks, features, and (tier) route groups", async () => {
    const rootDir = await createTempFeaturesDir()

    await writeRouteFile(rootDir, "start/command.ts", "export default () => {}")
    await writeRouteFile(
      rootDir,
      "order/[id]/callback.ts",
      "export default () => {}"
    )
    await writeRouteFile(
      rootDir,
      "order/[id]/confirm.callback.ts",
      "export default () => {}"
    )
    await writeRouteFile(
      rootDir,
      "(admin)/panel/command.ts",
      "export default () => {}"
    )
    await writeRouteFile(
      rootDir,
      "(developer)/icon/add-icon.command.ts",
      "export default () => {}"
    )
    await writeRouteFile(
      rootDir,
      "_shared/helper.command.ts",
      "export default () => {}"
    )
    await writeRouteFile(
      rootDir,
      "start/command.test.ts",
      "export default () => {}"
    )
    await writeRouteFile(rootDir, "start/command.d.ts", "export {}")

    const files = await discoverRoutes({ featuresDir: rootDir })

    expect(
      files.map((file) => ({
        kind: file.kind,
        relativePath: file.relativePath,
        featureName: file.featureName,
        access: file.access,
        commandName: file.commandName,
        callbackPattern: file.callbackPattern,
      }))
    ).toEqual([
      {
        kind: "command",
        relativePath: "(admin)/panel/command.ts",
        featureName: "panel",
        access: "admin",
        commandName: "panel",
        callbackPattern: undefined,
      },
      {
        kind: "command",
        relativePath: "(developer)/icon/add-icon.command.ts",
        featureName: "icon",
        access: "developer",
        commandName: "add_icon",
        callbackPattern: undefined,
      },
      {
        kind: "callback",
        relativePath: "order/[id]/callback.ts",
        featureName: "order",
        access: "public",
        commandName: undefined,
        callbackPattern: "order:[id]",
      },
      {
        kind: "callback",
        relativePath: "order/[id]/confirm.callback.ts",
        featureName: "order",
        access: "public",
        commandName: undefined,
        callbackPattern: "order:[id]:confirm",
      },
      {
        kind: "command",
        relativePath: "start/command.ts",
        featureName: "start",
        access: "public",
        commandName: "start",
        callbackPattern: undefined,
      },
    ])
  })
})

describe("loadFeatures & createFsRouter", () => {
  it("loads native ESM route modules and executes commands and dynamic callbacks", async () => {
    const rootDir = await createTempFeaturesDir()

    await writeRouteFile(
      rootDir,
      "start/command.mjs",
      [
        'export const description = "Welcome message"',
        "export default async function startCommand(ctx) {",
        '  await ctx.reply("started")',
        "}",
      ].join("\n")
    )

    await writeRouteFile(
      rootDir,
      "order/[id]/callback.mjs",
      [
        "export default async function orderCallback(ctx, params) {",
        '  await ctx.answerCallbackQuery({ text: "order:" + params.id })',
        "}",
      ].join("\n")
    )
    await writeRouteFile(
      rootDir,
      "(admin)/panel/command.mjs",
      [
        'export const config = { description: "Admin panel" }',
        "export default async function panelCommand(ctx) {",
        '  await ctx.reply("admin-panel")',
        "}",
      ].join("\n")
    )

    const router = await createFsRouter({
      featuresDir: rootDir,
      logger: false,
      guards: {
        admin: (ctx) => ctx.from?.id === 999,
      },
    })

    expect(router.discoveredFiles).toHaveLength(3)
    expect(router.buildCommandMenu("public")).toEqual([
      { command: "start", description: "Welcome message" },
    ])
    expect(router.buildCommandMenu("admin")).toEqual([
      { command: "start", description: "Welcome message" },
      { command: "panel", description: "Admin panel" },
    ])

    const apiCalls: { method: string; payload: Record<string, unknown> }[] = []
    const bot = new Bot(VALID_TOKEN, { botInfo: MOCK_BOT_INFO })
    bot.api.config.use((_prev, method, payload) => {
      apiCalls.push({ method, payload: payload as Record<string, unknown> })
      return Promise.resolve({ ok: true, result: true } as never)
    })
    bot.use(router.middleware)

    const startUpdate: Update = {
      update_id: 1,
      message: {
        message_id: 1,
        date: 1_700_000_000,
        chat: { id: 10, type: "private", first_name: "User" },
        from: { id: 10, is_bot: false, first_name: "User" },
        text: "/start",
        entities: [{ offset: 0, length: 6, type: "bot_command" }],
      },
    }

    const orderCallbackUpdate: Update = {
      update_id: 2,
      callback_query: {
        id: "cb_42",
        from: { id: 10, is_bot: false, first_name: "User" },
        chat_instance: "inst",
        data: "order:987",
        message: {
          message_id: 2,
          date: 1_700_000_000,
          chat: { id: 10, type: "private", first_name: "User" },
          text: "Order",
        },
      },
    }

    await bot.handleUpdate(startUpdate)
    await bot.handleUpdate(orderCallbackUpdate)

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        method: "sendMessage",
        payload: expect.objectContaining({ text: "started" }),
      })
    )
    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        method: "answerCallbackQuery",
        payload: expect.objectContaining({ text: "order:987" }),
      })
    )
  })

  it("supports a custom loadModule hook for HMR loaders", async () => {
    const rootDir = await createTempFeaturesDir()
    await writeRouteFile(rootDir, "ping/command.ts", "export default () => {}")

    const { features } = await loadFeatures({
      featuresDir: rootDir,
      loadModule: async () => ({
        description: "Check latency",
        default: async () => {},
      }),
    })

    expect(features).toHaveLength(1)
    expect(features[0]?.name).toBe("ping")
    expect(features[0]?.commands?.[0]?.name).toBe("ping")
    expect(features[0]?.commands?.[0]?.description).toBe("Check latency")
  })
})
