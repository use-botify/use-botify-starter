import type { BotCommandContext } from "@/core";

import { buildDevtoolsKeyboard, buildDevtoolsText } from "./devtools.build";

export async function developerDevtoolsCommand(
  ctx: BotCommandContext,
): Promise<void> {
  await ctx.reply(buildDevtoolsText(ctx.from), {
    parse_mode: "HTML",
    reply_markup: buildDevtoolsKeyboard("command"),
  });
}
