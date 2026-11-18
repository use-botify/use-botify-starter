import { InlineKeyboard } from "grammy"
import type { User } from "grammy/types"

import { iconCallbackButton, iconUrlButton } from "@/lib/icons"
import { DEVELOPER_ROUTES } from "@/features/developer/developer.route"
import { formatUserMention } from "@/utils/format-user-mention"
import {
  CONTACT_CHANNEL_URL,
  TERMS_AND_CONDITION,
} from "@/configs/constant.config"
import type { BotCommandContext } from "@/core"
import {
  isUserAdmin,
  isUserDeveloper,
} from "@/middlewares/access-guard.middleware"
import { upsertUserProfile } from "@/services/user.service"

export async function publicStartCommand(
  ctx: BotCommandContext
): Promise<void> {
  const user = ctx.from
  if (!user) return

  await upsertUserProfile(user)

  await ctx.reply(buildStartText(user), {
    reply_markup: buildStartKeyboard(user.id),
    parse_mode: "HTML",
  })
}

export function buildStartText(
  user?: Pick<User, "username" | "first_name">
): string {
  return [
    `Hey user, <b>${formatUserMention(user)}</b>`,
    "Welcome to <b>Botify Booster</b> - boost your Telegram channels and groups quickly and reliably.",
    `<i>Using this bot you agree our <a href="${TERMS_AND_CONDITION}">Terms and condition</a> of Service</i>`,
  ].join("\n\n")
}

export function buildStartKeyboard(userId: number): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .add(iconCallbackButton("buy", "Buy Boost"))
    .row()
    .add(iconUrlButton("chat", "Contact", CONTACT_CHANNEL_URL))
    .add(iconCallbackButton("flash", "Orders"))

  if (isUserAdmin(userId) && !isUserDeveloper(userId)) {
    keyboard.row().add(iconCallbackButton("shield", "Admin Panel"))
  }

  if (isUserDeveloper(userId)) {
    keyboard
      .row()
      .add(
        iconCallbackButton(
          "settings",
          "Devtools",
          DEVELOPER_ROUTES.devtools.build()
        )
      )
  }

  return keyboard
}
