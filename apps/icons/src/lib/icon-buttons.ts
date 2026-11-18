import type { InlineKeyboardButton } from "grammy/types"

import type { IconDetail } from "@/registry/icon.types"

export type IconCallbackButton = InlineKeyboardButton.CallbackButton & {
  icon_custom_emoji_id?: string
}

export type IconUrlButton = InlineKeyboardButton.UrlButton & {
  icon_custom_emoji_id?: string
}

// A missing icon is not an error for buttons: the button is sent without one.
const iconField = (icon: IconDetail | undefined) =>
  icon ? { icon_custom_emoji_id: icon.customEmojiId } : {}

export function buildCallbackButton(
  icon: IconDetail | undefined,
  text: string,
  callbackData: string
): IconCallbackButton {
  return { text, callback_data: callbackData, ...iconField(icon) }
}

export function buildUrlButton(
  icon: IconDetail | undefined,
  text: string,
  url: string
): IconUrlButton {
  return { text, url, ...iconField(icon) }
}
