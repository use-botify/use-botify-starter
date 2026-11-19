import process from "node:process"
import { styleText } from "node:util"

import { getIndianDateTime } from "@workspace/utils"
import type { DestinationStream, LevelWithSilent, LoggerOptions } from "pino"

type StyleFormat = Parameters<typeof styleText>[0]

interface LevelMeta {
  label: string
  style: StyleFormat
}

const VALID_LEVELS = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const satisfies readonly LevelWithSilent[]

const RESERVED_KEYS = new Set([
  "level",
  "time",
  "msg",
  "name",
  "pid",
  "hostname",
  "err",
])

const DEFAULT_LEVEL_META: LevelMeta = {
  label: "INFO ",
  style: "cyan",
}

const LEVEL_META: Record<number, LevelMeta> = {
  10: { label: "TRACE", style: "gray" },
  20: { label: "DEBUG", style: "magenta" },
  30: { label: "INFO ", style: "cyan" },
  40: { label: "WARN ", style: "yellow" },
  50: { label: "ERROR", style: "red" },
  60: { label: "FATAL", style: ["bgRed", "white"] },
}

function isLogLevel(value: string): value is LevelWithSilent {
  return (VALID_LEVELS as readonly string[]).includes(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function formatErrorField(err: unknown): string {
  if (!isRecord(err)) {
    return ""
  }

  if (typeof err.stack === "string" && err.stack.length > 0) {
    return `\n${styleText("red", err.stack)}`
  }

  if (typeof err.message === "string" && err.message.length > 0) {
    return `\n${styleText("red", err.message)}`
  }

  return ""
}

export function resolveLogLevel(level?: LevelWithSilent): LevelWithSilent {
  if (level) {
    return level
  }

  const envLevel = (process.env.LOG_LEVEL ?? "").trim().toLowerCase()
  return isLogLevel(envLevel) ? envLevel : "info"
}

export function createLoggerOptions(options?: {
  name?: string
  level?: LevelWithSilent
}): LoggerOptions {
  return {
    name: options?.name,
    level: resolveLogLevel(options?.level),
    base: undefined,
  }
}

export function createPrettyStream(): DestinationStream {
  return {
    write(chunk: string) {
      try {
        const parsed: unknown = JSON.parse(chunk)
        if (!isRecord(parsed)) {
          process.stdout.write(chunk)
          return
        }

        const levelNum = typeof parsed.level === "number" ? parsed.level : 30
        const timestamp =
          typeof parsed.time === "number" ? parsed.time : Date.now()
        const message = typeof parsed.msg === "string" ? parsed.msg : ""
        const scope =
          typeof parsed.name === "string" && parsed.name.length > 0
            ? ` ${styleText("dim", `[${parsed.name}]`)}`
            : ""

        const levelMeta = LEVEL_META[levelNum] ?? DEFAULT_LEVEL_META
        const formattedTime = styleText(
          "gray",
          `[${getIndianDateTime(timestamp)}]`
        )
        const formattedLevel = styleText(levelMeta.style, levelMeta.label)

        const extras: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(parsed)) {
          if (!RESERVED_KEYS.has(key)) {
            extras[key] = value
          }
        }

        const extrasText =
          Object.keys(extras).length > 0
            ? ` ${styleText("gray", JSON.stringify(extras))}`
            : ""
        const errorText = formatErrorField(parsed.err)

        const line = `${formattedTime} ${formattedLevel}${scope} ${message}${extrasText}${errorText}\n`
        const target = levelNum >= 50 ? process.stderr : process.stdout
        target.write(line)
      } catch {
        process.stdout.write(chunk)
      }
    },
  }
}
