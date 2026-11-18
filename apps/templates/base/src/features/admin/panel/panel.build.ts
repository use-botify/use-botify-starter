import { InlineKeyboard } from "grammy";

import type { Build_Mode } from "@/core/route.core";
import { ADMIN_ROUTES } from "@/features/admin/admin.route";
import { iconCallbackButton } from "@/lib/icons";

export function buildAdminPanelKeyboard(mode: Build_Mode): InlineKeyboard {
	const keyboard = new InlineKeyboard()
		.add(iconCallbackButton("settings", "Broadcast"))
		.row()
		.add(iconCallbackButton("settings", "Maintenance Mode"))
		.row()
		.add(iconCallbackButton("close", "Close", ADMIN_ROUTES.close.build()));

	if (mode === "start") {
		keyboard.add(iconCallbackButton("back", "Back"));
	}

	return keyboard;
}
