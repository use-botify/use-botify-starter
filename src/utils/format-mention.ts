import type { User } from "grammy/types";

import { escapeHtml } from "@/utils/escape-html";

export function formatMention(
	user?: Pick<User, "username" | "first_name">,
): string {
	if (!user) return "@user";
	if (user.username) return `@${escapeHtml(user.username)}`;
	return escapeHtml(user.first_name);
}
