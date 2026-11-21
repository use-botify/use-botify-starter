import { Bot } from "grammy"
import type { Update, UserFromGetMe } from "grammy/types"
import { describe, expect, it, vi } from "vitest"

import {
  BotifyRouterError,
  buildCommandMenu,
  checkFeatures,
  compareRouteSpecificity,
  createFeatureHelpers,
  createRouter,
  defineCallback,
  defineCallbackRoute,
  defineCommand,
  defineFeature,
  FeatureValidationError,
  hasRoutePrefix,
  routesCollide,
  syncCommandMenus,
  validateFeatures,
} from "../src/index"

const VALID_TOKEN = "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi"

const MOCK_BOT_INFO: UserFromGetMe = {
  id: 123456789,
  is_bot: true,
  first_name: "Botify Router",
  username: "botify_router_bot",
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

function createTestBot() {
  const apiCalls: { method: string; payload: Record<string, unknown> }[] = []
  const bot = new Bot(VALID_TOKEN, { botInfo: MOCK_BOT_INFO })

  bot.api.config.use((_prev, method, payload) => {
    apiCalls.push({ method, payload: payload as Record<string, unknown> })
    return Promise.resolve({ ok: true, result: true } as never)
  })

  return { bot, apiCalls }
}

function createCommandUpdate(command: string, userId: number): Update {
  return {
    update_id: 1,
    message: {
      message_id: 10,
      date: 1_700_000_000,
      chat: { id: userId, type: "private", first_name: "Test" },
      from: { id: userId, is_bot: false, first_name: "Test" },
      text: `/${command}`,
      entities: [
        { offset: 0, length: command.length + 1, type: "bot_command" },
      ],
    },
  }
}

function createCallbackUpdate(data: string, userId: number): Update {
  return {
    update_id: 2,
    callback_query: {
      id: "cb_1",
      from: { id: userId, is_bot: false, first_name: "Test" },
      chat_instance: "inst_1",
      data,
      message: {
        message_id: 11,
        date: 1_700_000_000,
        chat: { id: userId, type: "private", first_name: "Test" },
        text: "Menu",
      },
    },
  }
}

describe("defineCallbackRoute & collision helpers", () => {
  it("supports both {param} and [param] dynamic segments", () => {
    const braceRoute = defineCallbackRoute("order:pay:{orderId}:{method}")
    const bracketRoute = defineCallbackRoute("order:[orderId]:[action]")

    expect(braceRoute.isDynamic).toBe(true)
    expect(braceRoute.paramNames).toEqual(["orderId", "method"])
    expect(braceRoute.build({ orderId: 42, method: "ton" })).toBe(
      "order:pay:42:ton"
    )
    expect(braceRoute.match("order:pay:42:ton")).toEqual({
      orderId: "42",
      method: "ton",
    })
    expect(braceRoute.match("order:pay:42")).toBeNull()

    expect(bracketRoute.paramNames).toEqual(["orderId", "action"])
    expect(bracketRoute.build({ orderId: "abc", action: "confirm" })).toBe(
      "order:abc:confirm"
    )
    expect(bracketRoute.match("order:abc:confirm")).toEqual({
      orderId: "abc",
      action: "confirm",
    })
  })

  it("handles static routes and rejects invalid patterns or payloads", () => {
    const staticRoute = defineCallbackRoute("public:start")
    expect(staticRoute.isDynamic).toBe(false)
    expect(staticRoute.build()).toBe("public:start")
    expect(staticRoute.match("public:start")).toEqual({})

    expect(() => defineCallbackRoute("")).toThrow(BotifyRouterError)
    expect(() => defineCallbackRoute("bad::route")).toThrow(BotifyRouterError)
    expect(() => defineCallbackRoute("order:{id}:{id}")).toThrow(
      BotifyRouterError
    )

    const paramRoute = defineCallbackRoute("order:{id}")
    expect(() => paramRoute.build({ id: "bad:colon" })).toThrow(
      BotifyRouterError
    )
    expect(() => paramRoute.build({ id: "x".repeat(60) })).toThrow(
      BotifyRouterError
    )
  })

  it("detects prefixes, route collisions, and sorts by specificity", () => {
    const staticRoute = defineCallbackRoute("order:create")
    const dynamicRoute = defineCallbackRoute("order:[id]")
    const otherRoute = defineCallbackRoute("admin:panel")

    expect(hasRoutePrefix(staticRoute, "order")).toBe(true)
    expect(hasRoutePrefix(otherRoute, "order")).toBe(false)
    expect(routesCollide(staticRoute, dynamicRoute)).toBe(true)
    expect(routesCollide(staticRoute, otherRoute)).toBe(false)

    const sorted = [dynamicRoute, staticRoute].sort(compareRouteSpecificity)
    expect(sorted[0]?.pattern).toBe("order:create")
  })
})

describe("feature validation", () => {
  it("reports bad names, duplicate commands, missing prefixes, and colliding callbacks", () => {
    const badFeatures = [
      defineFeature({
        name: "BadName",
        access: "public",
        commands: [
          defineCommand({
            name: "/start",
            description: "",
            handler: () => {},
          }),
        ],
        callbacks: [
          defineCallback({
            route: "wrong:prefix",
            handler: () => {},
          }),
        ],
      }),
      defineFeature({
        name: "orders",
        access: "public",
        callbacks: [
          defineCallback({ route: "orders:list", handler: () => {} }),
          defineCallback({ route: "orders:[id]", handler: () => {} }),
        ],
      }),
    ]

    const problems = checkFeatures(badFeatures)
    expect(problems.length).toBeGreaterThanOrEqual(5)
    expect(() => validateFeatures(badFeatures)).toThrow(FeatureValidationError)
  })

  it("enforces cumulative Telegram menu size limits per tier", () => {
    const features = [
      defineFeature({
        name: "public",
        access: "public",
        commands: [
          defineCommand({ name: "a", description: "A", handler: () => {} }),
          defineCommand({ name: "b", description: "B", handler: () => {} }),
        ],
      }),
      defineFeature({
        name: "admin",
        access: "admin",
        commands: [
          defineCommand({ name: "c", description: "C", handler: () => {} }),
        ],
      }),
    ]

    expect(() =>
      validateFeatures(features, {
        tierOrder: ["public", "admin", "developer"],
        maxMenuCommands: 2,
      })
    ).toThrow(FeatureValidationError)
  })
})

describe("createRouter & command menus", () => {
  it("dispatches commands, dynamic callbacks, setup hooks, and blocks unauthorized access", async () => {
    const events: string[] = []
    const orderRoute = defineCallbackRoute("public:order:[id]")
    const adminCloseRoute = defineCallbackRoute("admin:close")
    const helpers = createFeatureHelpers()

    const features = [
      helpers.defineFeature({
        name: "public",
        access: "public",
        commands: [
          helpers.defineCommand({
            name: "start",
            description: "Start the bot",
            handler: () => {
              events.push("public:start")
            },
          }),
        ],
        callbacks: [
          helpers.defineCallback({
            route: orderRoute,
            handler: (_ctx, params) => {
              events.push(`public:order:${params.id}`)
            },
          }),
        ],
        setup: (composer) => {
          composer.command("ping", () => {
            events.push("public:ping")
          })
        },
      }),
      helpers.defineFeature({
        name: "admin",
        access: "admin",
        commands: [
          helpers.defineCommand({
            name: "panel",
            description: "Open admin panel",
            handler: () => {
              events.push("admin:panel")
            },
          }),
        ],
        callbacks: [
          helpers.defineCallback({
            route: adminCloseRoute,
            handler: () => {
              events.push("admin:close")
            },
          }),
        ],
      }),
    ]

    const onUnauthorizedCommand = vi.fn()
    const onUnauthorizedCallback = vi.fn()

    const router = createRouter({
      features,
      logger: false,
      guards: {
        admin: (ctx) => ctx.from?.id === 999,
      },
      onUnauthorizedCommand,
      onUnauthorizedCallback,
    })

    const { bot, apiCalls } = createTestBot()
    bot.use(router.middleware)

    await bot.handleUpdate(createCommandUpdate("start", 1))
    await bot.handleUpdate(createCallbackUpdate("public:order:77", 1))
    await bot.handleUpdate(createCommandUpdate("ping", 1))
    await bot.handleUpdate(createCommandUpdate("panel", 999))
    await bot.handleUpdate(createCallbackUpdate("admin:close", 999))

    // Unauthorized regular user triggers restricted command & callback
    await bot.handleUpdate(createCommandUpdate("panel", 1))
    await bot.handleUpdate(createCallbackUpdate("admin:close", 1))

    expect(events).toEqual([
      "public:start",
      "public:order:77",
      "public:ping",
      "admin:panel",
      "admin:close",
    ])
    expect(onUnauthorizedCommand).toHaveBeenCalledTimes(1)
    expect(onUnauthorizedCallback).toHaveBeenCalledTimes(1)
    expect(apiCalls.some((call) => call.method === "deleteMyCommands")).toBe(
      true
    )
  })

  it("throws when a restricted tier lacks an access guard", () => {
    const adminFeature = defineFeature({
      name: "admin",
      access: "admin",
      commands: [
        defineCommand({
          name: "panel",
          description: "Admin panel",
          handler: () => {},
        }),
      ],
    })

    expect(() =>
      createRouter({
        features: [adminFeature],
        logger: false,
      })
    ).toThrow(BotifyRouterError)
  })

  it("builds inherited command menus and syncs highest-privilege tier per chat", async () => {
    const features = [
      defineFeature({
        name: "public",
        access: "public",
        commands: [
          defineCommand({
            name: "start",
            description: "Public start",
            handler: () => {},
          }),
          defineCommand({
            name: "hidden",
            description: "Hidden",
            showInMenu: false,
            handler: () => {},
          }),
        ],
      }),
      defineFeature({
        name: "admin",
        access: "admin",
        commands: [
          defineCommand({
            name: "panel",
            description: "Admin panel",
            handler: () => {},
          }),
        ],
      }),
      defineFeature({
        name: "developer",
        access: "developer",
        commands: [
          defineCommand({
            name: "devtools",
            description: "Developer tools",
            handler: () => {},
          }),
        ],
      }),
    ]

    expect(buildCommandMenu(features, "public")).toEqual([
      { command: "start", description: "Public start" },
    ])
    expect(buildCommandMenu(features, "developer")).toEqual([
      { command: "start", description: "Public start" },
      { command: "panel", description: "Admin panel" },
      { command: "devtools", description: "Developer tools" },
    ])

    const setMyCommands = vi.fn(async () => true as const)
    const deleteMyCommands = vi.fn(async () => true as const)

    const result = await syncCommandMenus(
      { setMyCommands, deleteMyCommands },
      features,
      {
        logger: false,
        chatIdsByTier: {
          admin: [100, 200],
          developer: [200],
        },
      }
    )

    expect(result.defaultCommandCount).toBe(1)
    expect(result.syncedChats).toBe(2)
    expect(result.failedChats).toEqual([])
    expect(setMyCommands).toHaveBeenCalledTimes(3)
    expect(setMyCommands).toHaveBeenLastCalledWith(
      [
        { command: "start", description: "Public start" },
        { command: "panel", description: "Admin panel" },
        { command: "devtools", description: "Developer tools" },
      ],
      { scope: { type: "chat", chat_id: 200 } }
    )
  })
})
