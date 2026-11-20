import type { Context } from "grammy"

import type {
  BotConfigInput,
  ResolvedBotConfig,
  ResolvedShutdownOptions,
  ShutdownOptions,
} from "../types/core.types"
import { BotifyCoreError } from "./errors"
import { resolveLogger } from "./logger"
import { assertBotToken } from "./validate-token"

const DEFAULT_SHUTDOWN_SIGNALS: readonly NodeJS.Signals[] = [
  "SIGINT",
  "SIGTERM",
]
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000

function resolveShutdownOptions(
  input?: ShutdownOptions
): ResolvedShutdownOptions {
  const timeoutMs = input?.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS

  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new BotifyCoreError(
      "INVALID_CONFIG",
      `shutdown.timeoutMs must be a positive safe integer (received ${String(timeoutMs)}).`
    )
  }

  const signals = input?.signals ?? DEFAULT_SHUTDOWN_SIGNALS

  if (signals.length === 0) {
    throw new BotifyCoreError(
      "INVALID_CONFIG",
      "shutdown.signals must contain at least one signal."
    )
  }

  const onShutdown = input?.onShutdown
    ? Array.isArray(input.onShutdown)
      ? [...input.onShutdown]
      : [input.onShutdown]
    : []

  return Object.freeze({
    signals: Object.freeze([...signals]),
    timeoutMs,
    exitProcess: input?.exitProcess ?? true,
    onShutdown: Object.freeze(onShutdown),
  })
}

export function defineBotConfig<C extends Context = Context>(
  input: BotConfigInput<C>
): ResolvedBotConfig<C> {
  const token = assertBotToken(input.token)
  const logger = resolveLogger(input.logger)
  const shutdown = resolveShutdownOptions(input.shutdown)

  return Object.freeze({
    token,
    grammy: input.grammy,
    logger,
    verifyToken: input.verifyToken ?? true,
    polling: input.polling,
    shutdown,
  })
}
