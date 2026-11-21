import { escapeHtml } from "@workspace/utils"
import type { Api } from "grammy"
import type { MessageEntity, Sticker } from "grammy/types"

import type {
  ExtractedCustomEmoji,
  IconSourceMessage,
  IconStickerDetail,
  IconStickerFormat,
  InspectableEmojiMessage,
} from "../types/icon-tools.types"

const DEFAULT_FALLBACK_EMOJI = "✨"

function detectStickerFormat(
  sticker: Pick<Sticker, "is_animated" | "is_video">
): IconStickerFormat {
  if (sticker.is_video) {
    return "video"
  }

  if (sticker.is_animated) {
    return "animated"
  }

  return "static"
}

/**
 * Converts a Telegram `Sticker` object into a normalized `IconStickerDetail`.
 */
export function toIconStickerDetail(sticker: Sticker): IconStickerDetail {
  return Object.freeze<IconStickerDetail>({
    fileId: sticker.file_id,
    fileUniqueId: sticker.file_unique_id,
    emoji: sticker.emoji ?? null,
    setName: sticker.set_name ?? null,
    stickerType: sticker.type,
    width: sticker.width,
    height: sticker.height,
    isAnimated: sticker.is_animated,
    isVideo: sticker.is_video,
    format: detectStickerFormat(sticker),
  })
}

function buildSourceMessage(
  message: InspectableEmojiMessage
): IconSourceMessage {
  const forwardOrigin = message.forward_origin

  return Object.freeze<IconSourceMessage>({
    messageId: message.message_id,
    chatId: String(message.chat.id),
    isForwarded: forwardOrigin !== undefined,
    forwardOriginType: forwardOrigin?.type ?? null,
  })
}

function findCustomEmojiEntity(
  entities: readonly MessageEntity[] | undefined
): MessageEntity.CustomEmojiMessageEntity | undefined {
  if (!entities) {
    return undefined
  }

  for (const entity of entities) {
    if (entity.type === "custom_emoji") {
      return entity
    }
  }

  return undefined
}

/**
 * Normalizes an arbitrary user label into a clean `snake_case` icon key.
 * Returns an empty string if no ASCII alphanumeric characters remain.
 */
export function normalizeIconKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

/**
 * Resolves the best storage key for a captured custom emoji:
 * explicit user input → sticker set name → deterministic `icon_<suffix>` fallback.
 */
export function resolveCandidateKey(
  customEmojiId: string,
  preferredKey?: string,
  sticker?: IconStickerDetail | null
): string {
  if (preferredKey) {
    const normalizedPreferred = normalizeIconKey(preferredKey)
    if (normalizedPreferred.length > 0) {
      return normalizedPreferred
    }
  }

  if (sticker?.setName) {
    const normalizedSet = normalizeIconKey(sticker.setName)
    if (normalizedSet.length > 0) {
      return `${normalizedSet}_${customEmojiId.slice(-4)}`
    }
  }

  return `icon_${customEmojiId.slice(-6)}`
}

/**
 * Extracts the first Telegram custom emoji found in a message's text entities,
 * caption entities, or custom-emoji sticker payload.
 */
export function extractCustomEmoji(
  message: InspectableEmojiMessage | undefined
): ExtractedCustomEmoji | null {
  if (!message) {
    return null
  }

  const receivedMessage = buildSourceMessage(message)

  if (message.text) {
    const entity = findCustomEmojiEntity(message.entities)
    if (entity) {
      const slice = message.text.slice(
        entity.offset,
        entity.offset + entity.length
      )

      return Object.freeze<ExtractedCustomEmoji>({
        customEmojiId: entity.custom_emoji_id,
        fallback: slice.length > 0 ? slice : DEFAULT_FALLBACK_EMOJI,
        source: "text",
        entity: Object.freeze({
          offset: entity.offset,
          length: entity.length,
        }),
        sticker: null,
        receivedMessage,
      })
    }
  }

  if (message.caption) {
    const entity = findCustomEmojiEntity(message.caption_entities)
    if (entity) {
      const slice = message.caption.slice(
        entity.offset,
        entity.offset + entity.length
      )

      return Object.freeze<ExtractedCustomEmoji>({
        customEmojiId: entity.custom_emoji_id,
        fallback: slice.length > 0 ? slice : DEFAULT_FALLBACK_EMOJI,
        source: "caption",
        entity: Object.freeze({
          offset: entity.offset,
          length: entity.length,
        }),
        sticker: null,
        receivedMessage,
      })
    }
  }

  if (message.sticker?.custom_emoji_id) {
    const detail = toIconStickerDetail(message.sticker)

    return Object.freeze<ExtractedCustomEmoji>({
      customEmojiId: message.sticker.custom_emoji_id,
      fallback: detail.emoji ?? DEFAULT_FALLBACK_EMOJI,
      source: "sticker",
      entity: null,
      sticker: detail,
      receivedMessage,
    })
  }

  return null
}

/**
 * Fetches sticker metadata for a custom emoji ID via Telegram's
 * `getCustomEmojiStickers` API, returning `null` if unavailable.
 */
export async function fetchIconStickerDetail(
  api: Pick<Api, "getCustomEmojiStickers">,
  customEmojiId: string
): Promise<IconStickerDetail | null> {
  const stickers = await api.getCustomEmojiStickers([customEmojiId])
  const first = stickers[0]

  return first ? toIconStickerDetail(first) : null
}

/**
 * Renders a Telegram HTML `<tg-emoji>` tag with an HTML-escaped fallback.
 */
export function renderCustomEmojiTag(
  customEmojiId: string,
  fallback: string
): string {
  return `<tg-emoji emoji-id="${escapeHtml(customEmojiId)}">${escapeHtml(fallback)}</tg-emoji>`
}
