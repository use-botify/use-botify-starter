import type { Context } from "grammy";

import type { BotCommandContext } from "@/core";
import {
	ICON_REGISTRY,
	type IconDetail,
	type IconKey,
	renderIcon,
} from "@/lib/icons";
import { escapeHtml } from "@/utils/escape-html";

const MAX_PAGE_LENGTH = 3_500;
const EMPTY_REGISTRY_TEXT =
	"Your icon registry is empty. Reply to a message containing custom emoji with /add_icon <icon_name>.";

export async function developerSavedIconCommand(
	ctx: BotCommandContext,
): Promise<void> {
	await replySavedIcons(ctx);
}

export async function replySavedIcons(
	ctx: Pick<Context, "reply">,
): Promise<void> {
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

	if (pages.length === 0) {
		await ctx.reply(EMPTY_REGISTRY_TEXT);
		return;
	}

	const formattedPages = pages.map(
		(page, index) =>
			`${index === 0 ? "🎨 Registered Icons" : "🎨 Registered Icons (continued)"}\n\n${page}`,
	);

	for (const page of formattedPages) {
		await ctx.reply(page, { parse_mode: "HTML" });
	}
}