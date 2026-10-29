import { InlineKeyboard } from "grammy";

import type { Build_Mode } from "@/core/route.core";
import { DEVELOPER_ROUTES } from "@/features/developer/developer.route";
import { iconCallbackButton } from "@/lib/icons";

export function buildDevtoolsKeyboard(mode: Build_Mode): InlineKeyboard {
	const keyboard = new InlineKeyboard()
		.add(iconCallbackButton("settings", "Saved Icon"))
		.add(iconCallbackButton("settings", "Add Icon"))
		.row()
		.add(iconCallbackButton("settings", "Remove Icon"))
		.row()
		.add(iconCallbackButton("close", "Close", DEVELOPER_ROUTES.close.build()));

	if (mode === "start") {
		keyboard.add(iconCallbackButton("back", "Back"));
	}

	return keyboard;
}
