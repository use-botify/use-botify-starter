import { escapeHtml } from "@workspace/utils"

import type { MentionableUser } from "../types/panel.types"

/**
 * Formats a Telegram user as an HTML-safe `@username` or escaped `first_name`.
 */
export function formatUserMention(
  user?: MentionableUser,
  fallback = "@user"
): string {
  if (!user) {
    return escapeHtml(fallback)
  }

  if (user.username) {
    return `@${escapeHtml(user.username)}`
  }

  return escapeHtml(user.first_name)
}
