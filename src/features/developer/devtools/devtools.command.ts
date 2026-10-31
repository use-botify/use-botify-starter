import { InlineKeyboard } from "grammy";
import type { User } from "grammy/types";

import type { BotCommandContext } from "@/core";
import { guideRoute } from "@/features/developer/developer.guide";
import { DEVELOPER_ROUTES } from "@/features/developer/developer.route";
import { buildPanelGreeting } from "@/features/shared";
import { iconInlineButton } from "@/lib/icons";

export const DEVTOOLS_DESCRIPTION =
	"This is a developer panel. You can use it to explore the available commands and their usage.";

export async function developerDevtoolsCommand(
	ctx: BotCommandContext,
): Promise<void> {
	if (!ctx.from) return;

	const { caption, keyboard } = buildDevtoolsPanel(ctx.from);

	await ctx.reply(caption, {
		reply_markup: keyboard,
		parse_mode: "HTML",
	});
}

export function buildDevtoolsPanel(from: User) {
	const keyboard = new InlineKeyboard()
		.add(
			iconInlineButton("saved", "List icons", guideRoute("list_icons")),
			iconInlineButton("add", "Add icon", guideRoute("add_icon")),
		)
		.row()
		.add(iconInlineButton("delete", "Remove icon", guideRoute("remove_icon")))
		.row()
		.text("Cancel", DEVELOPER_ROUTES.close.build());

	return {
		caption: buildPanelGreeting("developer", from, DEVTOOLS_DESCRIPTION),
		keyboard,
	};
}
