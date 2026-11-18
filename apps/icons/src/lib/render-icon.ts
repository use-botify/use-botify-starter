import { escapeHtml } from "@/utils/escape-html"
import type { IconDetail } from "@/registry/icon.types"

/**
 * Renders a custom emoji as a Telegram HTML `<tg-emoji>` tag.
 * Use it with `parse_mode: "HTML"`.
 */
export function renderIconTag(icon: IconDetail): string {
  return (
    `<tg-emoji emoji-id="${escapeHtml(icon.customEmojiId)}">` +
    `${escapeHtml(icon.fallback)}</tg-emoji>`
  )
}
