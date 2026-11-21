import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { getErrorMessage, hasErrorCode } from "@workspace/utils"

import type { WriteIfChangedResult } from "../types/tooling.types"
import { BotifyToolingError } from "./errors"

const IDENTIFIER_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function formatObjectKey(key: string): string {
  return IDENTIFIER_KEY.test(key) ? key : JSON.stringify(key)
}

/**
 * Serializes a JSON-compatible value into clean, deterministic TypeScript
 * literal syntax with unquoted valid identifier keys.
 */
export function formatTsLiteral(
  value: unknown,
  indentLevel = 0,
  indentUnit = "  "
): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]"
    }

    const nextIndent = indentUnit.repeat(indentLevel + 1)
    const currentIndent = indentUnit.repeat(indentLevel)
    const items = value.map(
      (item) =>
        `${nextIndent}${formatTsLiteral(item, indentLevel + 1, indentUnit)},`
    )

    return `[\n${items.join("\n")}\n${currentIndent}]`
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).filter(
      ([, entryValue]) => entryValue !== undefined
    )

    if (entries.length === 0) {
      return "{}"
    }

    const nextIndent = indentUnit.repeat(indentLevel + 1)
    const currentIndent = indentUnit.repeat(indentLevel)
    const lines = entries.map(
      ([entryKey, entryValue]) =>
        `${nextIndent}${formatObjectKey(entryKey)}: ${formatTsLiteral(
          entryValue,
          indentLevel + 1,
          indentUnit
        )},`
    )

    return `{\n${lines.join("\n")}\n${currentIndent}}`
  }

  return "null"
}

/**
 * Writes UTF-8 content to disk atomically using a unique sibling temp file
 * and rename, preventing partial writes if the process exits mid-write.
 */
export async function writeAtomicFile(
  filePath: string,
  content: string
): Promise<void> {
  const resolvedPath = path.resolve(filePath)
  const tempPath = `${resolvedPath}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`

  try {
    await mkdir(path.dirname(resolvedPath), { recursive: true })
    await writeFile(tempPath, content, "utf8")
    await rename(tempPath, resolvedPath)
  } catch (error: unknown) {
    await rm(tempPath, { force: true }).catch(() => undefined)
    throw new BotifyToolingError(
      "FILE_WRITE_FAILED",
      `Failed to write "${resolvedPath}": ${getErrorMessage(error)}`,
      { cause: error }
    )
  }
}

/**
 * Writes `content` atomically only when the file does not exist or its
 * current contents differ. Avoids redundant timestamps and watcher loops.
 */
export async function writeFileIfChanged(
  filePath: string,
  content: string
): Promise<WriteIfChangedResult> {
  const resolvedPath = path.resolve(filePath)
  const bytes = Buffer.byteLength(content, "utf8")

  try {
    const current = await readFile(resolvedPath, "utf8")
    if (current === content) {
      return Object.freeze<WriteIfChangedResult>({
        filePath: resolvedPath,
        written: false,
        bytes,
      })
    }
  } catch (error: unknown) {
    if (!hasErrorCode(error, "ENOENT")) {
      throw new BotifyToolingError(
        "FILE_WRITE_FAILED",
        `Failed to read "${resolvedPath}" before writing: ${getErrorMessage(error)}`,
        { cause: error }
      )
    }
  }

  await writeAtomicFile(resolvedPath, content)

  return Object.freeze<WriteIfChangedResult>({
    filePath: resolvedPath,
    written: true,
    bytes,
  })
}
