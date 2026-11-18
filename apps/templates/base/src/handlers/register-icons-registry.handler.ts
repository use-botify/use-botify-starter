import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import { logger } from "@/lib/logger"
import { ICON_REGISTRY, type IconDetail } from "@/registry/icons.registry"

const JSON_REGISTRY_PATH = resolve(
  process.cwd(),
  "src/registry/icons.registry.json"
)
const TS_REGISTRY_PATH = resolve(
  process.cwd(),
  "src/registry/icons.registry.ts"
)

const IDENTIFIER_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function isValidIconEntry(value: unknown): value is IconDetail {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  return (
    "customEmojiId" in value &&
    typeof value.customEmojiId === "string" &&
    "fallback" in value &&
    typeof value.fallback === "string" &&
    "capturedAt" in value &&
    typeof value.capturedAt === "string"
  )
}

function formatObjectKey(key: string): string {
  return IDENTIFIER_KEY.test(key) ? key : JSON.stringify(key)
}

function formatTsLiteral(value: unknown, indentLevel = 0): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    const nextIndent = "\t".repeat(indentLevel + 1)
    const currentIndent = "\t".repeat(indentLevel)
    const items = value.map(
      (item) => `${nextIndent}${formatTsLiteral(item, indentLevel + 1)},`
    )
    return `[\n${items.join("\n")}\n${currentIndent}]`
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).filter(
      ([, entryValue]) => entryValue !== undefined
    )
    if (entries.length === 0) return "{}"

    const nextIndent = "\t".repeat(indentLevel + 1)
    const currentIndent = "\t".repeat(indentLevel)
    const lines = entries.map(
      ([entryKey, entryValue]) =>
        `${nextIndent}${formatObjectKey(entryKey)}: ${formatTsLiteral(
          entryValue,
          indentLevel + 1
        )},`
    )
    return `{\n${lines.join("\n")}\n${currentIndent}}`
  }

  return "null"
}

export function generateIconRegistryTsContent(
  registry: Record<string, IconDetail>
): string {
  const serializedIcons = formatTsLiteral(registry, 0)

  return [
    "// This file is auto-synced by src/handlers/register-icons-registry.handler.ts.",
    "// Do not edit DEFAULT_ICONS manually; use /grab_icon or /remove_icon to update icons.",
    "",
    'export type IconStickerFormat = "static" | "animated" | "video";',
    "",
    "export type IconStickerDetail = {",
    "\tfileId: string;",
    "\tfileUniqueId: string;",
    "\temoji: string | null;",
    "\tsetName: string | null;",
    "\tstickerType: string;",
    "\twidth: number;",
    "\theight: number;",
    "\tisAnimated: boolean;",
    "\tisVideo: boolean;",
    "\tformat: IconStickerFormat;",
    "};",
    "",
    "export type IconEntityPosition = {",
    "\toffset: number;",
    "\tlength: number;",
    "};",
    "",
    "export type IconSourceMessage = {",
    "\tmessageId: number;",
    "\tchatId: string;",
    "\tisForwarded: boolean;",
    "\tforwardOriginType: string | null;",
    "};",
    "",
    "export type IconDetail = {",
    "\tkey: string;",
    "\tcustomEmojiId: string;",
    "\tfallback: string;",
    "\tentity?: IconEntityPosition | null;",
    "\tsticker?: IconStickerDetail | null;",
    "\treceivedMessage?: IconSourceMessage;",
    "\tcapturedAt: string;",
    "};",
    "",
    `export const DEFAULT_ICONS = ${serializedIcons} as const satisfies Record<string, IconDetail>;`,
    "",
    "export type RegisteredIconKey = keyof typeof DEFAULT_ICONS;",
    "",
    "export type IconKey = [RegisteredIconKey] extends [never]",
    "\t? string",
    "\t: RegisteredIconKey;",
    "",
    "export type IconName = IconKey;",
    "",
    "export const ICON_REGISTRY: Record<string, IconDetail> = {",
    "\t...DEFAULT_ICONS,",
    "};",
    "",
  ].join("\n")
}

async function writeAtomicFile(
  filePath: string,
  content: string
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp`
  await writeFile(temporaryPath, content, "utf8")
  await rename(temporaryPath, filePath)
}

async function syncTypeScriptRegistryIfChanged(): Promise<void> {
  const nextTsContent = generateIconRegistryTsContent(ICON_REGISTRY)

  try {
    const currentTsContent = await readFile(TS_REGISTRY_PATH, "utf8")
    if (currentTsContent === nextTsContent) {
      return
    }
  } catch {
    // Write the file if it does not exist yet.
  }

  await writeAtomicFile(TS_REGISTRY_PATH, nextTsContent)
}

export async function persistIconRegistry(): Promise<void> {
  logger.debug("IconRegistry", "Persisting icon registry", {
    count: Object.keys(ICON_REGISTRY).length,
  })

  const jsonContent = `${JSON.stringify(ICON_REGISTRY, null, "\t")}\n`

  await Promise.all([
    writeAtomicFile(JSON_REGISTRY_PATH, jsonContent),
    syncTypeScriptRegistryIfChanged(),
  ])

  logger.info("IconRegistry", "Icon registry persisted successfully", {
    count: Object.keys(ICON_REGISTRY).length,
  })
}

export async function registerIconsRegistryHandler(): Promise<void> {
  logger.info("IconRegistry", "Loading icon registry")

  let content: string

  try {
    content = await readFile(JSON_REGISTRY_PATH, "utf8")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      await persistIconRegistry()
      return
    }

    throw error
  }

  const parsed: unknown = JSON.parse(content)

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Icon registry file must contain a JSON object.")
  }

  const loadedEntries: Record<string, IconDetail> = {}

  for (const [key, value] of Object.entries(parsed)) {
    if (!isValidIconEntry(value)) {
      throw new Error(`Invalid icon registry entry: ${key}`)
    }

    loadedEntries[key] = {
      ...value,
      key: typeof value.key === "string" && value.key ? value.key : key,
    }
  }

  for (const existingKey of Object.keys(ICON_REGISTRY)) {
    delete ICON_REGISTRY[existingKey]
  }

  Object.assign(ICON_REGISTRY, loadedEntries)
  await syncTypeScriptRegistryIfChanged()

  logger.info("IconRegistry", "Icon registry loaded successfully", {
    count: Object.keys(ICON_REGISTRY).length,
  })
}
