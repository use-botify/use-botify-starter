import type { BotCommandContext } from "@/core";

import { buildDevtoolsKeyboard } from "./devtools.build";
import { replyWithImage } from "@/lib/images";
import { formatMention } from "@/utils/format-mention";
import type { User } from "grammy/types";

export async function developerDevtoolsCommand(
  ctx: BotCommandContext,
): Promise<void> {
  await replyWithImage(ctx, "welcome", {
    caption: buildDevtoolsText(ctx.from),
    reply_markup: buildDevtoolsKeyboard("command"),
    parse_mode: "HTML",
  });
}

function buildDevtoolsText(
  user?: Pick<User, "username" | "first_name">,
): string {
  return [
    `Hey developer, <b>${formatMention(user)}</b>`,
    "Welcome to the DevTools panel. Here you can explore your command options and get their details of uses.",
  ].join("\n\n");
}
