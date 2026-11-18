export type IconStickerFormat = "static" | "animated" | "video"

export type IconStickerDetail = {
  fileId: string
  fileUniqueId: string
  emoji: string | null
  setName: string | null
  stickerType: string
  width: number
  height: number
  isAnimated: boolean
  isVideo: boolean
  format: IconStickerFormat
}

export type IconEntityPosition = {
  offset: number
  length: number
}

export type IconSourceMessage = {
  messageId: number
  chatId: string
  isForwarded: boolean
  forwardOriginType: string | null
}

export type IconDetail = {
  key: string
  customEmojiId: string
  fallback: string
  entity?: IconEntityPosition | null
  sticker?: IconStickerDetail | null
  receivedMessage?: IconSourceMessage
  capturedAt: string
}
