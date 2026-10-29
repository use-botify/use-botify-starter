import type { BotCallbackContext } from "@/core";

export async function developerDevtoolsCallback(
  ctx: BotCallbackContext,
): Promise<void> {
  await ctx.reply("Developer tools callback");
}
