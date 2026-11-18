import process from "node:process"

import pino, { type LevelWithSilent, type Logger } from "pino"

import { createLoggerOptions, createPrettyStream } from "./logger.config"

export interface CreateLoggerOptions {
  name?: string
  level?: LevelWithSilent
  format?: "pretty" | "json"
}

export type { LevelWithSilent, Logger }

function resolveLogFormat(format?: "pretty" | "json"): "pretty" | "json" {
  if (format) {
    return format
  }

  return process.env.LOG_FORMAT?.trim().toLowerCase() === "json"
    ? "json"
    : "pretty"
}

export function createLogger(options?: CreateLoggerOptions): Logger {
  const pinoOptions = createLoggerOptions(options)
  const format = resolveLogFormat(options?.format)

  if (format === "json") {
    return pino(pinoOptions)
  }

  return pino(pinoOptions, createPrettyStream())
}

export const logger: Logger = createLogger()
