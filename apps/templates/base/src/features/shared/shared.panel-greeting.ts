import { escapeHtml } from "@/utils/escape-html"
import {
  formatUserMention,
  type MentionableUser,
} from "@/utils/format-user-mention"
import type { UserRole } from "@/configs/access.config"

export function buildPanelGreeting(
  userRole: UserRole,
  user: MentionableUser,
  description?: string
): string {
  return [
    `Hey ${escapeHtml(userRole)}, <b>${formatUserMention(user)}</b>`,
    description,
  ].join("\n\n")
}
