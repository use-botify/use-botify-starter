import type { BotCommandContext } from "@/core";

export async function developerDevtoolsCommand(
	ctx: BotCommandContext,
): Promise<void> {
	await ctx.reply("Developer tools");
}
