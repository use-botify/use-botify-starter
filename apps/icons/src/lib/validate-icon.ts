import type { IconDetail } from "@/registry/icon.types"

const CUSTOM_EMOJI_ID = /^\d+$/

/**
 * Type guard for a stored icon entry. Optional fields (entity, sticker,
 * receivedMessage) are not inspected.
 */
export function isIconDetail(value: unknown): value is IconDetail {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const icon = value as Record<string, unknown>

  return (
    typeof icon.key === "string" &&
    icon.key.length > 0 &&
    typeof icon.customEmojiId === "string" &&
    CUSTOM_EMOJI_ID.test(icon.customEmojiId) &&
    typeof icon.fallback === "string" &&
    icon.fallback.length > 0 &&
    typeof icon.capturedAt === "string"
  )
}

/**
 * Throws a readable error when an icon is malformed or stored under a key
 * that differs from its own `key` field.
 */
export function assertIconDetail(
  key: string,
  value: unknown
): asserts value is IconDetail {
  if (!isIconDetail(value)) {
    throw new Error(
      `Invalid icon "${key}": expected key, a numeric customEmojiId, fallback and capturedAt.`
    )
  }

  if (value.key !== key) {
    throw new Error(
      `Icon "${key}" is stored under the wrong key (its key field is "${value.key}").`
    )
  }
}
