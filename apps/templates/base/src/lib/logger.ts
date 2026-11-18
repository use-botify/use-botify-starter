import process from "node:process"

import {
  createLogger,
  parseLogLevel,
  type LogLevel,
} from "@/configs/logger.config"

const DEFAULT_LOG_LEVEL: LogLevel =
  process.env.NODE_ENV === "test" ? "silent" : "info"

const logLevel = parseLogLevel(process.env.LOG_LEVEL, DEFAULT_LOG_LEVEL)

export const logger = createLogger(logLevel, (line) => {
  process.stdout.write(line)
})

export type { Logger, LogLevel } from "@/configs/logger.config"
