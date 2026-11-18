import { InlineKeyboard } from "grammy"
import type { User } from "grammy/types"

import { iconInlineButton } from "@/lib/icons"
import { guideRoute } from "@/features/developer/developer.guide"
import { DEVELOPER_ROUTES } from "@/features/developer/developer.route"
import { PUBLIC_ROUTES } from "@/features/public/public.route"
import { buildPanelGreeting } from "@/features/shared"
import type { BotCommandContext } from "@/core"

export const DEVTOOLS_DESCRIPTION =
  "This is a developer panel. You can use it to explore the available commands and their usage."
export type PanelMode = "callback" | "command"

export async function developerDevtoolsCommand(
  ctx: BotCommandContext
): Promise<void> {
  if (!ctx.from) return

  const { caption, keyboard } = buildDevtoolsPanel(ctx.from, "command")

  await ctx.reply(caption, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  })
}

export function buildDevtoolsPanel(from: User, mode: PanelMode) {
  const keyboard = new InlineKeyboard()

  keyboard
    .add(
      iconInlineButton("saved", "List icons", guideRoute("list_icons")),
      iconInlineButton("add", "Add icon", guideRoute("add_icon"))
    )
    .row()
    .add(iconInlineButton("delete", "Remove icon", guideRoute("remove_icon")))

  if (mode === "command") {
    keyboard
      .row()
      .add(iconInlineButton("close", "Close", DEVELOPER_ROUTES.close.build()))
  } else {
    keyboard
      .row()
      .add(iconInlineButton("back", "Back", PUBLIC_ROUTES.start.build()))
  }

  return {
    caption: buildPanelGreeting("developer", from, DEVTOOLS_DESCRIPTION),
    keyboard,
  }
}
