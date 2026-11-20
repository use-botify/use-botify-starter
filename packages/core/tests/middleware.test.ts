import {
  BotError,
  type Context,
  GrammyError,
  HttpError,
  type NextFunction,
} from "grammy"
import { describe, expect, it, vi } from "vitest"

import {
  autoAnswerCallback,
  createErrorHandler,
  createHmrDispatcher,
  rateLimiter,
} from "../src/middleware"

type Transformer = Parameters<Context["api"]["config"]["use"]>[0]
type TransformerSignal = Parameters<Transformer>[3]

function createCallbackContext(
  answerImpl: () => Promise<{ ok: true; result: true }> = async () => ({
    ok: true,
    result: true,
  })
) {
  const transformers: Transformer[] = []
  const rawAnswer = vi.fn(answerImpl)

  const runTransformers = (
    method: "answerCallbackQuery",
    payload: Record<string, unknown>
  ): Promise<{ ok: true; result: true }> => {
    let index = 0

    const invoke = async (
      nextMethod: string,
      nextPayload: Record<string, unknown>,
      signal?: TransformerSignal
    ): Promise<{ ok: true; result: true }> => {
      const current = transformers[index]
      index += 1

      if (current) {
        const result = await current(
          invoke as unknown as Parameters<Transformer>[0],
          nextMethod as "answerCallbackQuery",
          nextPayload as never,
          signal
        )
        return result as { ok: true; result: true }
      }

      return rawAnswer()
    }

    return invoke(method, payload)
  }

  const ctx = {
    from: { id: 42, username: "sahil" },
    callbackQuery: { id: "cb_1", data: "panel:open" },
    api: {
      config: {
        use(transformer: Transformer) {
          transformers.push(transformer)
        },
      },
    },
    answerCallbackQuery: vi.fn((payload: Record<string, unknown> = {}) =>
      runTransformers("answerCallbackQuery", payload)
    ),
  }

  return { ctx: ctx as unknown as Context, rawAnswer }
}

function createMessageContext(userId = 101) {
  const reply = vi.fn(async () => ({}))
  const answerCallbackQuery = vi.fn(async () => true)

  const ctx = {
    update: { update_id: 9001, message: { message_id: 1 } },
    from: { id: userId, username: "tester" },
    chat: { id: userId, type: "private" as const },
    reply,
    answerCallbackQuery,
  }

  return { ctx: ctx as unknown as Context, reply, answerCallbackQuery }
}

describe("autoAnswerCallback", () => {
  it("answers unanswered callbacks automatically and deduplicates manual answers", async () => {
    const middleware = autoAnswerCallback({ logger: false })

    const first = createCallbackContext()
    await middleware(first.ctx, async () => {})
    expect(first.rawAnswer).toHaveBeenCalledTimes(1)

    const second = createCallbackContext()
    await middleware(second.ctx, async () => {
      await second.ctx.answerCallbackQuery({ text: "Done" })
      await second.ctx.answerCallbackQuery({ text: "Duplicate" })
    })
    expect(second.rawAnswer).toHaveBeenCalledTimes(1)
  })

  it("swallows expired Telegram 400 callback errors", async () => {
    const middleware = autoAnswerCallback({ logger: false })
    const expired = createCallbackContext(async () => {
      throw new GrammyError(
        "Expired",
        {
          ok: false,
          error_code: 400,
          description:
            "Bad Request: query is too old and response timeout expired",
        },
        "answerCallbackQuery",
        {}
      )
    })

    await expect(
      middleware(expired.ctx, async () => {
        await expired.ctx.answerCallbackQuery()
      })
    ).resolves.toBeUndefined()
    expect(expired.rawAnswer).toHaveBeenCalledTimes(1)
  })
})

describe("rateLimiter", () => {
  it("enforces sliding window limits, warns once, and resets after window passes", async () => {
    let clock = 1_000
    const limiter = rateLimiter({
      intervalWindowMs: 3_000,
      maxRequests: 2,
      logger: false,
      now: () => clock,
    })

    try {
      const { ctx, reply } = createMessageContext(55)
      const next: NextFunction = vi.fn(async () => {})

      await limiter(ctx, next)
      await limiter(ctx, next)
      await limiter(ctx, next)
      await limiter(ctx, next)

      expect(next).toHaveBeenCalledTimes(2)
      expect(reply).toHaveBeenCalledTimes(1)

      clock += 3_000
      await limiter(ctx, next)
      expect(next).toHaveBeenCalledTimes(3)
    } finally {
      limiter.dispose()
    }
  })

  it("supports skip predicate and custom onLimitExceeded handler", async () => {
    const onLimitExceeded = vi.fn()
    const limiter = rateLimiter({
      maxRequests: 1,
      intervalWindowMs: 5_000,
      logger: false,
      skip: (ctx) => ctx.from?.id === 999,
      onLimitExceeded,
    })

    try {
      const admin = createMessageContext(999)
      const regular = createMessageContext(10)
      const next: NextFunction = vi.fn(async () => {})

      await limiter(admin.ctx, next)
      await limiter(admin.ctx, next)
      expect(next).toHaveBeenCalledTimes(2)

      await limiter(regular.ctx, next)
      await limiter(regular.ctx, next)
      expect(next).toHaveBeenCalledTimes(3)
      expect(onLimitExceeded).toHaveBeenCalledTimes(1)
    } finally {
      limiter.dispose()
    }
  })
})

describe("createErrorHandler", () => {
  it("handles 403 blocked users, 429 flood waits, and benign 400 errors", async () => {
    const onUserBlocked = vi.fn()
    const onFloodWait = vi.fn()
    const onError = vi.fn()

    const handler = createErrorHandler({
      logger: false,
      onUserBlocked,
      onFloodWait,
      onError,
      generateErrorId: () => "err-1234",
    })

    const msg = createMessageContext(77)

    await handler(
      new BotError(
        new GrammyError(
          "Forbidden",
          {
            ok: false,
            error_code: 403,
            description: "Forbidden: bot was blocked by the user",
          },
          "sendMessage",
          {}
        ),
        msg.ctx
      )
    )
    expect(onUserBlocked).toHaveBeenCalledTimes(1)
    expect(msg.reply).not.toHaveBeenCalled()

    await handler(
      new BotError(
        new GrammyError(
          "Too Many Requests",
          {
            ok: false,
            error_code: 429,
            description: "Too Many Requests: retry after 12",
            parameters: { retry_after: 12 },
          },
          "sendMessage",
          {}
        ),
        msg.ctx
      )
    )
    expect(onFloodWait).toHaveBeenCalledWith(
      msg.ctx,
      expect.any(GrammyError),
      12
    )

    await handler(
      new BotError(
        new GrammyError(
          "Benign",
          {
            ok: false,
            error_code: 400,
            description: "Bad Request: message is not modified",
          },
          "editMessageText",
          {}
        ),
        msg.ctx
      )
    )
    expect(onError).not.toHaveBeenCalled()
  })

  it("ignores network HttpError replies and sends fallback for unexpected errors", async () => {
    const onError = vi.fn()
    const handler = createErrorHandler({
      logger: false,
      onError,
      generateErrorId: () => "abc12345",
    })

    const msg = createMessageContext(88)

    await handler(
      new BotError(
        new HttpError("Network down", new Error("ECONNRESET")),
        msg.ctx
      )
    )
    expect(msg.reply).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()

    await handler(new BotError(new Error("Boom"), msg.ctx))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining("abc12345"))
  })
})

describe("createHmrDispatcher", () => {
  it("hot-swaps middleware and keeps the previous handler if compose throws", async () => {
    const onReplace = vi.fn()
    const hmr = createHmrDispatcher({ logger: false, onReplace })
    const { ctx } = createMessageContext(12)
    const calls: string[] = []

    expect(hmr.version).toBe(0)
    expect(hmr.hasActiveHandler).toBe(false)

    await hmr.middleware(ctx, async () => {
      calls.push("passthrough")
    })
    expect(calls).toEqual(["passthrough"])

    const v1 = await hmr.compose((composer) => {
      composer.use(async (_c, next) => {
        calls.push("v1")
        await next()
      })
    })
    expect(v1).toBe(1)
    expect(hmr.version).toBe(1)
    expect(hmr.hasActiveHandler).toBe(true)
    expect(onReplace).toHaveBeenCalledWith(1)

    await expect(
      hmr.compose(() => {
        throw new Error("Syntax or registration error")
      })
    ).rejects.toThrow(/registration error/)

    expect(hmr.version).toBe(1)

    calls.length = 0
    await hmr.middleware(ctx, async () => {
      calls.push("after")
    })
    expect(calls).toEqual(["v1", "after"])

    hmr.reset()
    expect(hmr.hasActiveHandler).toBe(false)

    calls.length = 0
    await hmr.middleware(ctx, async () => {
      calls.push("reset-next")
    })
    expect(calls).toEqual(["reset-next"])
  })
})
