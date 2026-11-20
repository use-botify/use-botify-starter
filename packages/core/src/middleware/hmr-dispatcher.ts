import {
  Composer,
  type Context,
  type Middleware,
  type MiddlewareFn,
} from "grammy"

import { resolveLogger } from "../lib/logger"
import type {
  HmrDispatcher,
  HmrDispatcherOptions,
} from "../types/middleware.types"

function toMiddlewareFn<C extends Context>(
  first: Middleware<C>,
  rest: readonly Middleware<C>[]
): MiddlewareFn<C> {
  if (rest.length === 0 && typeof first === "function") {
    return first
  }

  return new Composer<C>(first, ...rest).middleware()
}

export function createHmrDispatcher<C extends Context = Context>(
  options: HmrDispatcherOptions<C> = {}
): HmrDispatcher<C> {
  const logger = resolveLogger(options.logger)

  const passthrough: MiddlewareFn<C> = async (_ctx, next) => {
    await next()
  }

  let activeMiddleware: MiddlewareFn<C> = options.initial
    ? toMiddlewareFn(options.initial, [])
    : passthrough
  let hasActiveHandler = options.initial !== undefined
  let version = 0

  const middleware: MiddlewareFn<C> = (ctx, next) => activeMiddleware(ctx, next)

  const replace = (first: Middleware<C>, ...rest: Middleware<C>[]): number => {
    activeMiddleware = toMiddlewareFn(first, rest)
    hasActiveHandler = true
    version += 1

    logger.debug("HMR", "Swapped active middleware", { version })
    options.onReplace?.(version)

    return version
  }

  const compose = async (
    configure: (composer: Composer<C>) => void | Promise<void>
  ): Promise<number> => {
    const nextComposer = new Composer<C>()
    await configure(nextComposer)
    return replace(nextComposer)
  }

  const reset = (): void => {
    activeMiddleware = passthrough
    hasActiveHandler = false
    logger.debug("HMR", "Reset active middleware to pass-through", { version })
  }

  return Object.freeze<HmrDispatcher<C>>({
    middleware,
    get version(): number {
      return version
    },
    get hasActiveHandler(): boolean {
      return hasActiveHandler
    },
    replace,
    compose,
    reset,
  })
}
