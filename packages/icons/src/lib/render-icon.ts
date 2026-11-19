import { escapeHtml } from "@workspace/utils"

import type { Icon, IconDetail } from "../types/icon.types"

/**
 * Renders a custom emoji as a Telegram HTML `<tg-emoji>` tag.
 * Use with `parse_mode: "HTML"`.
 */
export function renderIconTag(
  icon: Pick<IconDetail, "customEmojiId" | "fallback">
): string {
  return `<tg-emoji emoji-id="${escapeHtml(icon.customEmojiId)}">${escapeHtml(icon.fallback)}</tg-emoji>`
}

/**
 * Wraps an `IconDetail` into a frozen smart `Icon` that works directly inside
 * template strings (`${chatIcon} Welcome`) while exposing all metadata fields.
 */
export function createIcon<K extends string>(detail: IconDetail<K>): Icon<K> {
  const html = renderIconTag(detail)

  return Object.freeze({
    ...detail,
    html,
    toString(): string {
      return html
    },
  })
}
