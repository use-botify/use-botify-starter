import type { UserFromGetMe } from "grammy/types"
import { describe, expect, it, vi } from "vitest"

import {
  assertBotToken,
  BotifyCoreError,
  createBot,
  createConsoleLogger,
  defineBotConfig,
  isValidBotToken,
  maskBotToken,
  noopLogger,
  resolveLogger,
  setupGracefulShutdown,
  verifyBotToken,
} from "../src/index"
import type { CoreLogger } from "../src/types"

const VALID_TOKEN = "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi"

const MOCK_BOT_INFO: UserFromGetMe = {
  id: 123456789,
  is_bot: true,
  first_name: "Botify Test",
  username: "botify_test_bot",
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

function createSpyLogger(): CoreLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  }
}

describe("bot token validation & verification", () => {
  it("validates and masks Telegram bot tokens", () => {
    expect(isValidBotToken(VALID_TOKEN)).toBe(true)
    expect(isValidBotToken(`  ${VALID_TOKEN}  `)).toBe(true)
    expect(isValidBotToken("invalid-token")).toBe(false)
    expect(isValidBotToken("123:short")).toBe(false)
    expect(isValidBotToken(12345)).toBe(false)

    expect(maskBotToken(VALID_TOKEN)).toBe("123456789:ABC***ghi")
    expect(maskBotToken("12345:short")).toBe("12345:***")
    expect(maskBotToken("no-colon")).toBe("***")
  })

  it("throws BotifyCoreError for missing or malformed tokens", () => {
    expect(() => assertBotToken("")).toThrow(BotifyCoreError)

    try {
      assertBotToken("12345:bad")
      expect.unreachable("Expected assertBotToken to throw")
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BotifyCoreError)
      expect((error as BotifyCoreError).code).toBe("INVALID_BOT_TOKEN")
    }
  })

  it("verifies token via api.getMe and wraps rejections cleanly", async () => {
    const okApi = { getMe: vi.fn(async () => MOCK_BOT_INFO) }
    const verified = await verifyBotToken(okApi, VALID_TOKEN)

    expect(verified.botInfo).toEqual(MOCK_BOT_INFO)
    expect(verified.maskedToken).toBe("123456789:ABC***ghi")

    const failApi = {
      getMe: vi.fn(async () => {
        throw new Error("401: Unauthorized")
      }),
    }

    await expect(verifyBotToken(failApi, VALID_TOKEN)).rejects.toMatchObject({
      name: "BotifyCoreError",
      code: "TOKEN_VERIFICATION_FAILED",
    })
  })
})

describe("defineBotConfig & logger resolution", () => {
  it("applies defaults and freezes the resolved config", () => {
    const config = defineBotConfig({
      token: `  ${VALID_TOKEN}  `,
      logger: false,
    })

    expect(config.token).toBe(VALID_TOKEN)
    expect(config.logger).toBe(noopLogger)
    expect(config.verifyToken).toBe(true)
    expect(config.shutdown.signals).toEqual(["SIGINT", "SIGTERM"])
    expect(config.shutdown.timeoutMs).toBe(10_000)
    expect(config.shutdown.exitProcess).toBe(true)
    expect(Object.isFrozen(config)).toBe(true)
    expect(Object.isFrozen(config.shutdown)).toBe(true)
  })

  it("rejects invalid shutdown options", () => {
    expect(() =>
      defineBotConfig({
        token: VALID_TOKEN,
        shutdown: { timeoutMs: 0 },
      })
    ).toThrow(BotifyCoreError)

    expect(() =>
      defineBotConfig({
        token: VALID_TOKEN,
        shutdown: { signals: [] },
      })
    ).toThrow(BotifyCoreError)
  })

  it("resolves console, custom, and silent loggers", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const consoleLogger = createConsoleLogger("warn")
    consoleLogger.info("Test", "ignored")
    consoleLogger.warn("Test", "visible warn", { count: 1 })
    consoleLogger.error("Test", "visible error")

    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledTimes(1)

    const custom = createSpyLogger()
    expect(resolveLogger(custom)).toBe(custom)
    expect(resolveLogger(false)).toBe(noopLogger)
  })
})

describe("setupGracefulShutdown", () => {
  it("runs stop and hooks once even on concurrent shutdown calls", async () => {
    const logger = createSpyLogger()
    const order: string[] = []
    const stop = vi.fn(async () => {
      order.push("stop")
    })
    const hook1 = vi.fn(async (signal: NodeJS.Signals) => {
      order.push(`hook1:${signal}`)
    })
    const hook2 = vi.fn(async () => {
      order.push("hook2")
      throw new Error("hook failed")
    })
    const extraHook = vi.fn(async () => {
      order.push("extra")
    })

    const controller = setupGracefulShutdown({
      stop,
      logger,
      options: {
        signals: ["SIGINT", "SIGTERM"],
        timeoutMs: 1_000,
        exitProcess: false,
        onShutdown: [hook1, hook2],
      },
      getExtraHooks: () => [extraHook],
      registerSignals: false,
    })

    expect(controller.isShuttingDown).toBe(false)

    await Promise.all([
      controller.shutdown("SIGINT"),
      controller.shutdown("SIGTERM"),
    ])

    expect(controller.isShuttingDown).toBe(true)
    expect(stop).toHaveBeenCalledTimes(1)
    expect(order).toEqual(["stop", "hook1:SIGINT", "hook2", "extra"])
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it("rejects with SHUTDOWN_TIMEOUT when cleanup hangs", async () => {
    const logger = createSpyLogger()

    const controller = setupGracefulShutdown({
      stop: () => new Promise(() => {}),
      logger,
      options: {
        signals: ["SIGTERM"],
        timeoutMs: 25,
        exitProcess: false,
        onShutdown: [],
      },
      registerSignals: false,
    })

    await expect(controller.shutdown("SIGTERM")).rejects.toMatchObject({
      name: "BotifyCoreError",
      code: "SHUTDOWN_TIMEOUT",
    })
    expect(logger.fatal).toHaveBeenCalledTimes(1)
  })
})

describe("createBot lifecycle", () => {
  it("verifies token, starts polling, runs hooks, and stops cleanly", async () => {
    const logger = createSpyLogger()
    const onShutdownHook = vi.fn()
    const onStartHook = vi.fn()

    const app = createBot({
      token: VALID_TOKEN,
      logger,
      shutdown: {
        exitProcess: false,
      },
    })

    const removeHook = app.onShutdown(onShutdownHook)
    const dynamicHook = vi.fn()
    app.onShutdown(dynamicHook)
    removeHook()

    let releasePolling: (() => void) | undefined
    let running = false

    vi.spyOn(app.bot.api, "getMe").mockResolvedValue(MOCK_BOT_INFO)
    vi.spyOn(app.bot, "isRunning").mockImplementation(() => running)
    vi.spyOn(app.bot, "start").mockImplementation(async (options) => {
      running = true
      await options?.onStart?.(MOCK_BOT_INFO)
      await new Promise<void>((resolve) => {
        releasePolling = resolve
      })
    })
    vi.spyOn(app.bot, "stop").mockImplementation(async () => {
      running = false
      releasePolling?.()
    })

    expect(app.status).toBe("idle")

    const info = await app.start({
      registerSignals: false,
      onStart: onStartHook,
    })

    expect(info).toEqual(MOCK_BOT_INFO)
    expect(app.status).toBe("running")
    expect(app.botInfo).toEqual(MOCK_BOT_INFO)
    expect(onStartHook).toHaveBeenCalledWith(MOCK_BOT_INFO)

    await expect(app.start({ registerSignals: false })).rejects.toMatchObject({
      name: "BotifyCoreError",
      code: "BOT_ALREADY_RUNNING",
    })

    await app.stop("SIGINT")

    expect(app.status).toBe("stopped")
    expect(onShutdownHook).not.toHaveBeenCalled()
    expect(dynamicHook).toHaveBeenCalledWith("SIGINT")
  })
})
