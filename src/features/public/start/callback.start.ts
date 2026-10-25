import type { CallbackQueryContext } from "grammy";

import type { BotContext } from "@/lib/bot";

export async function startCallback(
	ctx: CallbackQueryContext<BotContext>,
): Promise<void> {
	await ctx.reply("Hello, this is start callback");
}
