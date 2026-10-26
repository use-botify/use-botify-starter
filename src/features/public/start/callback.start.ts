import type { CallbackQueryContextWithBotContext } from "@/configs/feature.config";

export async function startCallback(
	ctx: CallbackQueryContextWithBotContext,
): Promise<void> {
	await ctx.reply("Hello, this is start callback");
}
