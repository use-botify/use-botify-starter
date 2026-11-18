import { Composer, type MiddlewareFn } from "grammy"

import type { BotContext } from "@/lib/bot"
import type { Feature } from "@/core"
import { registerFeaturesHandlers } from "@/handlers/register-features.handler"

let activeHotModuleReplacementMiddleware: MiddlewareFn<BotContext> = async (
  _ctx,
  next
) => {
  await next()
}

export const hotModuleReplacementDispatcher: MiddlewareFn<BotContext> = (
  ctx,
  next
) => activeHotModuleReplacementMiddleware(ctx, next)

export function replaceHotModuleReplacementMiddleware(
  middleware: MiddlewareFn<BotContext>
): void {
  activeHotModuleReplacementMiddleware = middleware
}

export function createHotModuleReplacementMiddleware(
  features: readonly Feature[]
) {
  const composer = new Composer<BotContext>()

  registerFeaturesHandlers(composer, features)

  return composer.middleware()
}
