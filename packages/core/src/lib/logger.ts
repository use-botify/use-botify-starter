import type { CoreLogger, LogLevel, LogMeta } from "../types/core.types"

const LEVEL_PRIORITY: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
}

const noop = (): void => {}

export const noopLogger: CoreLogger = Object.freeze({
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
})

function formatMeta(meta?: LogMeta): string {
  if (!meta || Object.keys(meta).length === 0) {
    return ""
  }

  try {
    return ` ${JSON.stringify(meta)}`
  } catch {
    return " [Unserializable meta]"
  }
}

export function createConsoleLogger(minLevel: LogLevel = "info"): CoreLogger {
  const threshold = LEVEL_PRIORITY[minLevel]

  const write = (
    level: LogLevel,
    scope: string,
    message: string,
    meta?: LogMeta
  ): void => {
    if (LEVEL_PRIORITY[level] < threshold) {
      return
    }

    const line = `[${level.toUpperCase()}] [${scope}] ${message}${formatMeta(meta)}`

    if (level === "error" || level === "fatal") {
      console.error(line)
      return
    }

    if (level === "warn") {
      console.warn(line)
      return
    }

    console.log(line)
  }

  return Object.freeze<CoreLogger>({
    debug: (scope, message, meta) => write("debug", scope, message, meta),
    info: (scope, message, meta) => write("info", scope, message, meta),
    warn: (scope, message, meta) => write("warn", scope, message, meta),
    error: (scope, message, meta) => write("error", scope, message, meta),
    fatal: (scope, message, meta) => write("fatal", scope, message, meta),
  })
}

export function resolveLogger(logger?: CoreLogger | false): CoreLogger {
  if (logger === false) {
    return noopLogger
  }

  return logger ?? createConsoleLogger()
}
