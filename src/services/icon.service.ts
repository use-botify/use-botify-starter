import {
	ICON_REGISTRY,
	type IconDetail,
	type IconKey,
	renderIcon,
} from "@/lib/icons";
import { escapeHtml } from "@/utils/escape-html";

const MAX_PAGE_LENGTH = 3_500;

/** One HTML message per page; empty array when the registry is empty. */
export function buildSavedIconPages(): string[] {
	const lines = (Object.entries(ICON_REGISTRY) as [IconKey, IconDetail][]).map(
		([key, icon], index) =>
			`${index + 1}. ${escapeHtml(key)} ${renderIcon(key)}\nID: ${escapeHtml(icon.customEmojiId)}`,
	);

	const pages: string[] = [];
	let current = "";

	for (const line of lines) {
		const next = current ? `${current}\n\n${line}` : line;

		if (current && next.length > MAX_PAGE_LENGTH) {
			pages.push(current);
			current = line;
		} else {
			current = next;
		}
	}

	if (current) pages.push(current);

	return pages.map(
		(page, index) =>
			`${index === 0 ? "🎨 Registered Icons" : "🎨 Registered Icons (continued)"}\n\n${page}`,
	);
}
