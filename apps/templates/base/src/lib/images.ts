import { GrammyError, type Api, type Context, type InputFile } from "grammy"

import {
  cacheImageFileId,
  forgetImageFileId,
  getImage,
  getImageSource,
} from "@/core/image.core"
import type { ImageName } from "@/configs/image.config"

type ReplyOptions = Parameters<Context["replyWithPhoto"]>[1]
type SendOptions = Parameters<Api["sendPhoto"]>[2]
type ChatId = Parameters<Api["sendPhoto"]>[0]
type PhotoMessage = Awaited<ReturnType<Context["replyWithPhoto"]>>

function isRejectedFileId(error: unknown): boolean {
  if (!(error instanceof GrammyError) || error.error_code !== 400) {
    return false
  }

  const description = error.description.toLowerCase()
  return (
    description.includes("file identifier") ||
    description.includes("file_id") ||
    description.includes("http url")
  )
}

function rememberFileId(name: ImageName, message: PhotoMessage): void {
  const fileId = message.photo.at(-1)?.file_id
  if (fileId) cacheImageFileId(name, fileId)
}

async function sendWithCache(
  name: ImageName,
  send: (photo: string | InputFile) => Promise<PhotoMessage>
): Promise<PhotoMessage> {
  const source = getImageSource(name)

  try {
    const message = await send(source)
    rememberFileId(name, message)
    return message
  } catch (error) {
    if (typeof source !== "string" || !isRejectedFileId(error)) throw error

    forgetImageFileId(name)
    const message = await send(getImage(name))
    rememberFileId(name, message)
    return message
  }
}

export function replyWithImage(
  ctx: Pick<Context, "replyWithPhoto">,
  name: ImageName,
  other?: ReplyOptions
) {
  return sendWithCache(name, (photo) => ctx.replyWithPhoto(photo, other))
}

export function sendImage(
  api: Pick<Api, "sendPhoto">,
  chatId: ChatId,
  name: ImageName,
  other?: SendOptions
) {
  return sendWithCache(name, (photo) => api.sendPhoto(chatId, photo, other))
}
