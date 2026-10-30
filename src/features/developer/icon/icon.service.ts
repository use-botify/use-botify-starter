import type { Message } from "grammy/types";

import {
  ICON_REGISTRY,
  type IconDetail,
  type IconEntityPosition,
  type IconStickerDetail,
} from "@/registry/icons.registry";

export type CapturedIcon = {
  customEmojiId: string;
  fallback: string;
  entity: IconEntityPosition | null;
  sticker?: IconStickerDetail;
};

export type SaveIconResult =
  | { status: "saved"; key: string; icon: IconDetail }
  | { status: "duplicate"; key: string; icon: IconDetail };

export function normalizeIconKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildDefaultIconKey(customEmojiId: string): string {
  return normalizeIconKey(`icon_${customEmojiId}`);
}

export function resolveCandidateKey(
  providedKeys: readonly string[],
  index: number,
  total: number,
  icon: CapturedIcon,
): string {
  if (providedKeys.length === 0) {
    return buildDefaultIconKey(icon.customEmojiId);
  }

  if (providedKeys.length === 1 && total > 1) {
    return `${providedKeys[0]}_${index + 1}`;
  }

  return providedKeys[index] ?? buildDefaultIconKey(icon.customEmojiId);
}

export function extractCustomEmoji(message: Message): CapturedIcon[] {
  if ("sticker" in message && message.sticker) {
    const { sticker } = message;

    if (!sticker.custom_emoji_id) {
      return [];
    }

    return [
      {
        customEmojiId: sticker.custom_emoji_id,
        fallback: sticker.emoji ?? "✨",
        entity: null,
        sticker: {
          fileId: sticker.file_id,
          fileUniqueId: sticker.file_unique_id,
          emoji: sticker.emoji ?? null,
          setName: sticker.set_name ?? null,
          stickerType: sticker.type,
          width: sticker.width,
          height: sticker.height,
          isAnimated: sticker.is_animated,
          isVideo: sticker.is_video,
          format: sticker.is_video
            ? "video"
            : sticker.is_animated
              ? "animated"
              : "static",
        },
      },
    ];
  }

  const text = "text" in message ? message.text : undefined;
  const caption = "caption" in message ? message.caption : undefined;
  const entities =
    "entities" in message
      ? message.entities
      : "caption_entities" in message
        ? message.caption_entities
        : undefined;

  const sourceText = text ?? caption ?? "";

  if (!entities?.length || !sourceText) {
    return [];
  }

  return entities.flatMap((entity): CapturedIcon[] => {
    if (entity.type !== "custom_emoji" || !entity.custom_emoji_id) {
      return [];
    }

    return [
      {
        customEmojiId: entity.custom_emoji_id,
        fallback:
          sourceText.slice(entity.offset, entity.offset + entity.length) ||
          "✨",
        entity: {
          offset: entity.offset,
          length: entity.length,
        },
      },
    ];
  });
}

export function createIconDetail(
  key: string,
  customEmojiId: string,
  fallback: string,
  options?: {
    entity?: IconEntityPosition | null;
    sticker?: IconStickerDetail | null;
  },
): IconDetail {
  return {
    key,
    customEmojiId,
    fallback,
    ...(options?.entity !== undefined ? { entity: options.entity } : {}),
    ...(options?.sticker !== undefined ? { sticker: options.sticker } : {}),
    capturedAt: new Date().toISOString(),
  };
}

export function saveIcon(
  key: string,
  customEmojiId: string,
  fallback: string,
  options?: {
    entity?: IconEntityPosition | null;
    sticker?: IconStickerDetail | null;
  },
): SaveIconResult {
  const normalizedKey = normalizeIconKey(key);

  if (!normalizedKey) {
    throw new Error("Icon name must contain at least one letter or number.");
  }

  const existing = ICON_REGISTRY[normalizedKey];
  if (existing) {
    return { status: "duplicate", key: normalizedKey, icon: existing };
  }

  const icon = createIconDetail(
    normalizedKey,
    customEmojiId,
    fallback,
    options,
  );
  ICON_REGISTRY[normalizedKey] = icon;

  return { status: "saved", key: normalizedKey, icon };
}
