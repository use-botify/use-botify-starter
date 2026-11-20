import process from "node:process"

import { getErrorMessage } from "@workspace/utils"

import type {
  SetupGracefulShutdownParams,
  ShutdownController,
} from "../types/core.types"
import { BotifyCoreError } from "./errors"

async function withTimeout(
  work: Promise<void>,
  timeoutMs: number
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new BotifyCoreError(
          "SHUTDOWN_TIMEOUT",
          `Graceful shutdown exceeded ${timeoutMs}ms timeout.`
        )
      )
    }, timeoutMs)
    timer.unref()
  })

  try {
    await Promise.race([work, timeoutPromise])
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }
}

export function setupGracefulShutdown(
  params: SetupGracefulShutdownParams
): ShutdownController {
  const { stop, logger, options, getExtraHooks } = params
  const registerSignals = params.registerSignals ?? true

  let shutdownPromise: Promise<void> | undefined
  let hadError = false
  const listeners = new Map<NodeJS.Signals, () => void>()

  const unregister = (): void => {
    for (const [signal, listener] of listeners) {
      process.off(signal, listener)
    }
    listeners.clear()
  }

  const runSequence = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info("Shutdown", `Initiating graceful shutdown (${signal})`)

    try {
      await stop()
    } catch (error: unknown) {
      hadError = true
      logger.error("Shutdown", "Failed to stop bot cleanly", {
        signal,
        error: getErrorMessage(error),
      })
    }

    const hooks = [...options.onShutdown, ...(getExtraHooks?.() ?? [])]

    for (const [index, hook] of hooks.entries()) {
      try {
        await hook(signal)
      } catch (error: unknown) {
        hadError = true
        logger.error("Shutdown", "Shutdown hook failed", {
          signal,
          hookIndex: index,
          error: getErrorMessage(error),
        })
      }
    }
  }

  const shutdown = (signal: NodeJS.Signals = "SIGTERM"): Promise<void> => {
    if (shutdownPromise) {
      return shutdownPromise
    }

    shutdownPromise = (async () => {
      try {
        await withTimeout(runSequence(signal), options.timeoutMs)
        if (!hadError) {
          logger.info("Shutdown", "Graceful shutdown complete", { signal })
        }
      } catch (error: unknown) {
        hadError = true
        logger.fatal("Shutdown", getErrorMessage(error), {
          signal,
          timeoutMs: options.timeoutMs,
        })
        throw error
      } finally {
        unregister()
      }
    })()

    return shutdownPromise
  }

  if (registerSignals) {
    for (const signal of options.signals) {
      const listener = (): void => {
        if (shutdownPromise) {
          logger.warn(
            "Shutdown",
            `Received ${signal} while shutdown is already in progress`
          )
          return
        }

        void shutdown(signal)
          .catch(() => {
            hadError = true
          })
          .finally(() => {
            if (options.exitProcess) {
              process.exit(hadError ? 1 : 0)
            }
          })
      }

      listeners.set(signal, listener)
      process.on(signal, listener)
    }
  }

  return Object.freeze<ShutdownController>({
    get isShuttingDown(): boolean {
      return shutdownPromise !== undefined
    },
    shutdown,
    unregister,
  })
}
