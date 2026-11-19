import type {
  IconCallbackButton,
  IconDetail,
  IconUrlButton,
} from "../types/icon.types"

export function buildCallbackButton(
  icon: Pick<IconDetail, "customEmojiId"> | undefined,
  text: string,
  callbackData = "noop"
): IconCallbackButton {
  return icon
    ? {
        text,
        callback_data: callbackData,
        icon_custom_emoji_id: icon.customEmojiId,
      }
    : {
        text,
        callback_data: callbackData,
      }
}

export function buildUrlButton(
  icon: Pick<IconDetail, "customEmojiId"> | undefined,
  text: string,
  url: string
): IconUrlButton {
  return icon
    ? {
        text,
        url,
        icon_custom_emoji_id: icon.customEmojiId,
      }
    : {
        text,
        url,
      }
}
