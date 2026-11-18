import type { BotCallbackContext } from "@/core"

import { buildStartKeyboard, buildStartText } from "./start.command"

export async function publicStartCallback(
  ctx: BotCallbackContext
): Promise<void> {
  const user = ctx.from
  if (!user) return

  await ctx.editMessageText(buildStartText(user), {
    reply_markup: buildStartKeyboard(user.id),
    parse_mode: "HTML",
  })
}
