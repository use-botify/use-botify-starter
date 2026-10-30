import type { User } from "grammy/types";

import { escapeHtml } from "@/utils/escape-html";

export type MentionableUser = Pick<User, "username" | "first_name">;

export function formatUserMention(user?: MentionableUser): string {
  if (!user) return "@user";

  if (user.username) {
    return `@${escapeHtml(user.username)}`;
  }

  return escapeHtml(user.first_name);
}
