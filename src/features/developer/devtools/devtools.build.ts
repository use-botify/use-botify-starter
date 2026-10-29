import { InlineKeyboard } from "grammy";
import type { User } from "grammy/types";

import type { Build_Mode } from "@/core/route.core";
import { iconCallbackButton } from "@/lib/icons";
import { formatMention } from "@/utils/format-mention";

import { DEVELOPER_ROUTES } from "../developer.route";

export function buildDevtoolsText(
	user?: Pick<User, "username" | "first_name">,
): string {
	return [
		`Hey developer, <b>${formatMention(user)}</b>`,
		"Welcome to the DevTools panel. Here you can explore your command options and get their details of uses.",
	].join("\n\n");
}

export function buildDevtoolsKeyboard(mode: Build_Mode): InlineKeyboard {
	if (mode === "start") {
		return new InlineKeyboard().add(iconCallbackButton("back", "Back"));
	}

	return new InlineKeyboard()
		.add(iconCallbackButton("settings", "Saved Icon"))
		.add(iconCallbackButton("settings", "Add Icon"))
		.row()
		.add(iconCallbackButton("settings", "Remove Icon"))
		.row()
		.add(iconCallbackButton("close", "Close", DEVELOPER_ROUTES.close.build()));
}
