import { InlineKeyboard } from "grammy";

import type { BotCallbackContext } from "@/core";
import { iconInlineButton } from "@/lib/icons";
import { escapeHtml } from "@/utils/escape-html";

export type GuidePanelItem = {
	route: string;
	use_case?: string;
	steps: string[];
	execute?: (ctx: BotCallbackContext) => Promise<void>;
};

export type GuidePanel = Record<string, GuidePanelItem>;

export type GuidePanelNavigation = {
	execute?: string | undefined;
	back: string;
};

export function buildGuidePanel(
	guide: GuidePanelItem,
	navigation: GuidePanelNavigation,
) {
	const keyboard = new InlineKeyboard();

	if (navigation.execute) {
		keyboard
			.add(iconInlineButton("flash", "Execute Command", navigation.execute))
			.row();
	}

	keyboard.add(iconInlineButton("back", "Back", navigation.back));

	const text = [
		`<b>Command:</b> <code>${escapeHtml(guide.route)}</code>`,
		...(guide.use_case
			? [`<b>USE CASE</b>\n${escapeHtml(guide.use_case)}`]
			: []),
		`<b>HOW TO USE</b>\n${guide.steps
			.map((step, index) => `${index + 1}. ${escapeHtml(step)}`)
			.join("\n")}`,
	].join("\n\n");

	return { text, keyboard };
}
