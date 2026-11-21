import { readFile } from "node:fs/promises"
import path from "node:path"

import { getErrorMessage } from "@workspace/utils"
import { type Api, type Context, GrammyError, InputFile } from "grammy"
import type { Message } from "grammy/types"

import { BotifyPluginError } from "../lib/errors"
import type {
  CreateImagePluginOptions,
  ImageKey,
  ImageManifest,
  ImagePlugin,
  LoadedImage,
  ReplyPhotoOptions,
  SendPhotoOptions,
} from "../types/image.types"
import {
  DEFAULT_IMAGE_FORMATS,
  IMAGE_MIME_TYPES,
  MAX_TELEGRAM_PHOTO_BYTES,
  validateImageBuffer,
} from "./detect-format"

const STALE_FILE_ID_PATTERN =
  /wrong (?:remote )?file identifier|file_id|file reference|invalid file/i

function isStaleFileIdError(error: unknown): boolean {
  if (error instanceof GrammyError) {
    return (
      error.error_code === 400 && STALE_FILE_ID_PATTERN.test(error.description)
    )
  }

  return STALE_FILE_ID_PATTERN.test(getErrorMessage(error))
}

function extractLargestPhotoFileId(
  message: Message.PhotoMessage
): string | undefined {
  const photos = message.photo
  if (!Array.isArray(photos) || photos.length === 0) {
    return undefined
  }

  return photos.at(-1)?.file_id
}

function resolveAssetPath(
  key: string,
  assetsDir: string,
  entry: string
): string {
  if (entry.trim().length === 0) {
    throw new BotifyPluginError(
      "INVALID_PLUGIN_CONFIG",
      `Image manifest entry "${key}" cannot be empty.`
    )
  }

  if (path.isAbsolute(entry)) {
    return path.resolve(entry)
  }

  const resolved = path.resolve(assetsDir, entry)
  const relative = path.relative(assetsDir, resolved)

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new BotifyPluginError(
      "INVALID_PLUGIN_CONFIG",
      `Image "${key}" resolves outside assetsDir ("${entry}").`
    )
  }

  return resolved
}

/**
 * Creates a self-contained image plugin with magic-byte validation,
 * per-instance Telegram `file_id` caching, and stale-ID retry fallback.
 */
export function createImagePlugin<const TManifest extends ImageManifest>(
  options: CreateImagePluginOptions<TManifest>
): ImagePlugin<ImageKey<TManifest>> {
  type Key = ImageKey<TManifest>

  const assetsDir = path.resolve(options.assetsDir)
  const maxBytes = options.maxBytes ?? MAX_TELEGRAM_PHOTO_BYTES
  const allowedFormats = options.allowedFormats ?? DEFAULT_IMAGE_FORMATS
  const logger = options.logger === false ? undefined : options.logger

  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new BotifyPluginError(
      "INVALID_PLUGIN_CONFIG",
      `maxBytes must be a positive safe integer (received ${String(maxBytes)}).`
    )
  }

  if (allowedFormats.length === 0) {
    throw new BotifyPluginError(
      "INVALID_PLUGIN_CONFIG",
      "allowedFormats must contain at least one image format."
    )
  }

  const keys = Object.freeze(Object.keys(options.manifest) as Key[])
  const keySet = new Set<string>(keys)
  const loaded = new Map<Key, LoadedImage>()
  const fileIds = new Map<Key, string>()

  if (options.initialFileIds) {
    for (const key of keys) {
      const initialId = options.initialFileIds[key]
      if (typeof initialId === "string" && initialId.length > 0) {
        fileIds.set(key, initialId)
      }
    }
  }

  const get = (key: Key): LoadedImage => {
    const image = loaded.get(key)
    if (!image) {
      throw new BotifyPluginError(
        "IMAGE_NOT_FOUND",
        keySet.has(key)
          ? `Image "${key}" has not been loaded yet. Call await images.load() during startup.`
          : `Unknown image key "${key}".`
      )
    }

    return image
  }

  const toInputFile = (key: Key): InputFile => {
    const image = get(key)
    return new InputFile(image.buffer, image.fileName)
  }

  const load = async (): Promise<Readonly<Record<Key, LoadedImage>>> => {
    const nextLoaded = new Map<Key, LoadedImage>()

    for (const key of keys) {
      const manifestEntry = options.manifest[key]
      if (manifestEntry === undefined) {
        continue
      }

      const filePath = resolveAssetPath(key, assetsDir, manifestEntry)
      let buffer: Buffer

      try {
        buffer = await readFile(filePath)
      } catch (error: unknown) {
        throw new BotifyPluginError(
          "IMAGE_LOAD_FAILED",
          `Failed to read image "${key}" at "${filePath}": ${getErrorMessage(error)}`,
          { cause: error }
        )
      }

      const format = validateImageBuffer(key, buffer, {
        maxBytes,
        allowedFormats,
      })

      nextLoaded.set(
        key,
        Object.freeze<LoadedImage>({
          key,
          filePath,
          fileName: path.basename(filePath),
          format,
          mimeType: IMAGE_MIME_TYPES[format],
          bytes: buffer.byteLength,
          buffer,
        })
      )
    }

    loaded.clear()
    const snapshot: Record<string, LoadedImage> = {}
    for (const [key, image] of nextLoaded) {
      loaded.set(key, image)
      snapshot[key] = image
    }

    logger?.info("Images", "Loaded image assets", {
      count: loaded.size,
      assetsDir,
    })

    return Object.freeze(snapshot) as Readonly<Record<Key, LoadedImage>>
  }

  const sendWithCache = async (
    key: Key,
    deliver: (photo: string | InputFile) => Promise<Message.PhotoMessage>
  ): Promise<Message.PhotoMessage> => {
    const cachedFileId = fileIds.get(key)

    if (cachedFileId) {
      try {
        return await deliver(cachedFileId)
      } catch (error: unknown) {
        if (!isStaleFileIdError(error)) {
          throw error
        }

        fileIds.delete(key)
        logger?.warn(
          "Images",
          "Cached file_id rejected by Telegram; retrying with buffer upload",
          {
            key,
            error: getErrorMessage(error),
          }
        )
      }
    }

    const sent = await deliver(toInputFile(key))
    const newFileId = extractLargestPhotoFileId(sent)
    if (newFileId) {
      fileIds.set(key, newFileId)
    }

    return sent
  }

  const replyWithImage = <C extends Context>(
    ctx: C,
    key: Key,
    replyOptions?: ReplyPhotoOptions
  ): Promise<Message.PhotoMessage> =>
    sendWithCache(key, (photo) => ctx.replyWithPhoto(photo, replyOptions))

  const sendImage = (
    api: Pick<Api, "sendPhoto">,
    chatId: number | string,
    key: Key,
    sendOptions?: SendPhotoOptions
  ): Promise<Message.PhotoMessage> =>
    sendWithCache(key, (photo) => api.sendPhoto(chatId, photo, sendOptions))

  return Object.freeze<ImagePlugin<Key>>({
    keys,
    get size(): number {
      return loaded.size
    },
    load,
    get,
    has: (key: string): key is Key => keySet.has(key),
    getFileId: (key: Key) => fileIds.get(key),
    setFileId: (key: Key, fileId: string) => {
      if (!keySet.has(key)) {
        throw new BotifyPluginError(
          "IMAGE_NOT_FOUND",
          `Cannot set file_id for unknown image key "${key}".`
        )
      }
      if (fileId.trim().length === 0) {
        throw new BotifyPluginError(
          "INVALID_PLUGIN_CONFIG",
          `file_id for image "${key}" cannot be empty.`
        )
      }
      fileIds.set(key, fileId)
    },
    clearFileId: (key?: Key) => {
      if (key === undefined) {
        fileIds.clear()
      } else {
        fileIds.delete(key)
      }
    },
    toInputFile,
    replyWithImage,
    sendImage,
  })
}
