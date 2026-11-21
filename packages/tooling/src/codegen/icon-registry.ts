import { readFile } from "node:fs/promises"
import path from "node:path"

import { getErrorMessage, hasErrorCode } from "@workspace/utils"

import { BotifyToolingError } from "../lib/errors"
import { formatTsLiteral, writeFileIfChanged } from "../lib/fs-utils"
import type {
  GenerateIconRegistryTsOptions,
  IconRegistryPersistResult,
  IconRegistryStore,
  IconRegistryStoreOptions,
  StoredIconEntry,
} from "../types/codegen.types"

const CUSTOM_EMOJI_ID_PATTERN = /^\d+$/
const VALID_IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/

const DEFAULT_ICON_BANNER = [
  "// This file is auto-synced by @use-botify/tooling.",
  "// Do not edit manually; update icons via your bot commands or JSON registry.",
].join("\n")

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Runtime type guard for stored Telegram custom emoji entries.
 */
export function isStoredIconEntry(value: unknown): value is StoredIconEntry {
  if (!isRecord(value)) {
    return false
  }

  const hasValidCapturedAt =
    value.capturedAt === undefined ||
    (typeof value.capturedAt === "string" && value.capturedAt.length > 0)

  return (
    typeof value.key === "string" &&
    value.key.length > 0 &&
    typeof value.customEmojiId === "string" &&
    CUSTOM_EMOJI_ID_PATTERN.test(value.customEmojiId) &&
    typeof value.fallback === "string" &&
    value.fallback.length > 0 &&
    hasValidCapturedAt
  )
}

function assertStoredIconEntry(
  key: string,
  value: unknown
): asserts value is StoredIconEntry {
  if (!isStoredIconEntry(value)) {
    throw new BotifyToolingError(
      "INVALID_ICON_REGISTRY",
      `Invalid icon entry "${key}": expected non-empty key, numeric customEmojiId, and non-empty fallback.`
    )
  }

  if (value.key !== key) {
    throw new BotifyToolingError(
      "INVALID_ICON_REGISTRY",
      `Icon "${key}" is stored under the wrong key (its key field is "${value.key}").`
    )
  }
}

function toSortedRecord(
  entries: ReadonlyMap<string, StoredIconEntry>
): Readonly<Record<string, StoredIconEntry>> {
  const sortedKeys = [...entries.keys()].sort((a, b) => a.localeCompare(b))
  const snapshot: Record<string, StoredIconEntry> = {}

  for (const key of sortedKeys) {
    const entry = entries.get(key)
    if (entry) {
      snapshot[key] = entry
    }
  }

  return Object.freeze(snapshot)
}

/**
 * Generates a self-contained, strictly-typed TypeScript registry file from
 * stored icon entries. Structurally compatible with `@use-botify/icons`.
 */
export function generateIconRegistryTs(
  registry: Readonly<Record<string, StoredIconEntry>>,
  options: GenerateIconRegistryTsOptions = {}
): string {
  const banner = options.banner ?? DEFAULT_ICON_BANNER
  const exportName = options.exportName ?? "CUSTOM_ICONS"
  const indent = options.indent ?? "  "

  if (!VALID_IDENTIFIER_PATTERN.test(exportName)) {
    throw new BotifyToolingError(
      "INVALID_TOOLING_CONFIG",
      `Invalid exportName "${exportName}": must be a valid TypeScript identifier.`
    )
  }

  const sorted: Record<string, StoredIconEntry> = {}
  for (const key of Object.keys(registry).sort((a, b) => a.localeCompare(b))) {
    const entry = registry[key]
    if (entry) {
      assertStoredIconEntry(key, entry)
      sorted[key] = entry
    }
  }

  const serialized = formatTsLiteral(sorted, 0, indent)

  return [
    banner,
    "",
    'export type IconStickerFormat = "static" | "animated" | "video"',
    "",
    "export interface IconStickerDetail {",
    `${indent}readonly fileId: string`,
    `${indent}readonly fileUniqueId: string`,
    `${indent}readonly emoji: string | null`,
    `${indent}readonly setName: string | null`,
    `${indent}readonly stickerType: string`,
    `${indent}readonly width: number`,
    `${indent}readonly height: number`,
    `${indent}readonly isAnimated: boolean`,
    `${indent}readonly isVideo: boolean`,
    `${indent}readonly format: IconStickerFormat`,
    "}",
    "",
    "export interface IconEntityPosition {",
    `${indent}readonly offset: number`,
    `${indent}readonly length: number`,
    "}",
    "",
    "export interface IconSourceMessage {",
    `${indent}readonly messageId: number`,
    `${indent}readonly chatId: string`,
    `${indent}readonly isForwarded: boolean`,
    `${indent}readonly forwardOriginType: string | null`,
    "}",
    "",
    "export interface StoredIconDetail {",
    `${indent}readonly key: string`,
    `${indent}readonly customEmojiId: string`,
    `${indent}readonly fallback: string`,
    `${indent}readonly capturedAt?: string`,
    `${indent}readonly entity?: IconEntityPosition | null`,
    `${indent}readonly sticker?: IconStickerDetail | null`,
    `${indent}readonly receivedMessage?: IconSourceMessage`,
    "}",
    "",
    `export const ${exportName} = ${serialized} as const satisfies Record<string, StoredIconDetail>`,
    "",
    `export type RegisteredIconKey = keyof typeof ${exportName}`,
    "",
    "export type IconKey = [RegisteredIconKey] extends [never]",
    `${indent}? string`,
    `${indent}: RegisteredIconKey`,
    "",
  ].join("\n")
}

/**
 * Creates a file-backed JSON/TS icon registry store with upfront validation
 * and crash-safe atomic writes.
 */
export function createIconRegistryStore(
  options: IconRegistryStoreOptions
): IconRegistryStore {
  const jsonPath = path.resolve(options.jsonPath)
  const tsPath = options.tsPath ? path.resolve(options.tsPath) : undefined
  const logger = options.logger === false ? undefined : options.logger

  const entries = new Map<string, StoredIconEntry>()

  if (options.initialIcons) {
    for (const [key, entry] of Object.entries(options.initialIcons)) {
      assertStoredIconEntry(key, entry)
      entries.set(key, Object.freeze({ ...entry }))
    }
  }

  const persist = async (): Promise<IconRegistryPersistResult> => {
    const snapshot = toSortedRecord(entries)
    const jsonContent = `${JSON.stringify(snapshot, null, 2)}\n`

    const jsonResult = await writeFileIfChanged(jsonPath, jsonContent)

    let tsResult: IconRegistryPersistResult["ts"]
    if (tsPath) {
      const tsContent = generateIconRegistryTs(snapshot, {
        banner: options.banner,
        exportName: options.exportName,
        indent: options.indent,
      })
      tsResult = await writeFileIfChanged(tsPath, tsContent)
    }

    logger?.info("IconRegistry", "Persisted icon registry", {
      count: entries.size,
      jsonWritten: jsonResult.written,
      tsWritten: tsResult?.written ?? false,
    })

    return Object.freeze<IconRegistryPersistResult>({
      count: entries.size,
      json: jsonResult,
      ts: tsResult,
    })
  }

  const load = async (): Promise<Readonly<Record<string, StoredIconEntry>>> => {
    let rawContent: string

    try {
      rawContent = await readFile(jsonPath, "utf8")
    } catch (error: unknown) {
      if (hasErrorCode(error, "ENOENT")) {
        await persist()
        return toSortedRecord(entries)
      }

      throw new BotifyToolingError(
        "INVALID_ICON_REGISTRY",
        `Failed to read icon registry "${jsonPath}": ${getErrorMessage(error)}`,
        { cause: error }
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawContent)
    } catch (error: unknown) {
      throw new BotifyToolingError(
        "INVALID_ICON_REGISTRY",
        `Icon registry "${jsonPath}" contains invalid JSON: ${getErrorMessage(error)}`,
        { cause: error }
      )
    }

    if (!isRecord(parsed)) {
      throw new BotifyToolingError(
        "INVALID_ICON_REGISTRY",
        `Icon registry "${jsonPath}" must contain a JSON object.`
      )
    }

    const validated = new Map<string, StoredIconEntry>()

    for (const [key, value] of Object.entries(parsed)) {
      if (!isRecord(value)) {
        throw new BotifyToolingError(
          "INVALID_ICON_REGISTRY",
          `Invalid icon entry "${key}": expected an object.`
        )
      }

      const normalized: Record<string, unknown> = {
        ...value,
        key: typeof value.key === "string" && value.key ? value.key : key,
      }

      assertStoredIconEntry(key, normalized)
      validated.set(key, Object.freeze({ ...normalized }))
    }

    entries.clear()
    for (const [key, entry] of validated) {
      entries.set(key, entry)
    }

    if (tsPath) {
      const snapshot = toSortedRecord(entries)
      const tsContent = generateIconRegistryTs(snapshot, {
        banner: options.banner,
        exportName: options.exportName,
        indent: options.indent,
      })
      await writeFileIfChanged(tsPath, tsContent)
    }

    logger?.info("IconRegistry", "Loaded icon registry", {
      count: entries.size,
      jsonPath,
    })

    return toSortedRecord(entries)
  }

  return Object.freeze<IconRegistryStore>({
    get size(): number {
      return entries.size
    },
    load,
    persist,
    getAll: () => toSortedRecord(entries),
    get: (key: string) => entries.get(key),
    has: (key: string) => entries.has(key),
    set: (key: string, entry: StoredIconEntry) => {
      assertStoredIconEntry(key, entry)
      const frozen = Object.freeze({ ...entry })
      entries.set(key, frozen)
      return frozen
    },
    remove: (key: string) => entries.delete(key),
  })
}
