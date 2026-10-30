import type { User } from "grammy/types";

import type { BotCommandContext } from "@/core";
import { buildAdminPanelKeyboard } from "@/features/admin/panel/panel.build";
import { formatUserMention } from "@/utils/format-user-mention";

export async function adminPanelCommand(ctx: BotCommandContext): Promise<void> {
	await ctx.reply(buildAdminPanelText(ctx.from), {
		parse_mode: "HTML",
		reply_markup: buildAdminPanelKeyboard("command"),
	});
}

function buildAdminPanelText(
	user?: Pick<User, "username" | "first_name">,
): string {
	return [
		`Hey admin, <b>${formatUserMention(user)}</b>`,
		"Welcome to the <b>Admin Panel</b>. From here you can inspect available admin commands and manage bot operations.",
	].join("\n\n");
}
