import { InlineKeyboard } from "grammy";
import type { User } from "grammy/types";

import {
	CONTACT_CHANNEL_URL,
	TERMS_AND_CONDITION,
} from "@/configs/constant.config";
import type { BotCommandContext } from "@/core";
import { iconCallbackButton, iconUrlButton } from "@/lib/icons";
import { replyWithImage } from "@/lib/images";
import {
	isUserAdmin,
	isUserDeveloper,
} from "@/middlewares/access-guard.middleware";
import { upsertUserProfile } from "@/services/user.service";
import { formatMention } from "@/utils/format-mention";

export async function publicStartCommand(
	ctx: BotCommandContext,
): Promise<void> {
	const user = ctx.from;
	if (!user) return;

	await upsertUserProfile(user);

	await replyWithImage(ctx, "welcome", {
		caption: buildStartText(user),
		reply_markup: buildStartKeyboard(user.id),
		parse_mode: "HTML",
	});
}

function buildStartText(user?: Pick<User, "username" | "first_name">): string {
	return [
		`Hey user, <b>${formatMention(user)}</b>`,
		"Welcome to <b>Botify Booster</b> - boost your Telegram channels and groups quickly and reliably.",
		`<i>Using this bot you agree our <a href="${TERMS_AND_CONDITION}">Terms and condition</a> of Service</i>`,
	].join("\n\n");
}

function buildStartKeyboard(userId: number): InlineKeyboard {
	const keyboard = new InlineKeyboard()
		.add(iconCallbackButton("buy", "Buy Boost"))
		.row()
		.add(iconUrlButton("chat", "Contact", CONTACT_CHANNEL_URL))
		.add(iconCallbackButton("flash", "Orders"));

	if (isUserAdmin(userId) && !isUserDeveloper(userId)) {
		keyboard.row().add(iconCallbackButton("shield", "Admin Panel"));
	}

	if (isUserDeveloper(userId)) {
		keyboard.row().add(iconCallbackButton("settings", "Devtools"));
	}

	return keyboard;
}
