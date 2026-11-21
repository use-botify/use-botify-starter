import { BotifyPluginError } from "../lib/errors"
import type { ImageFormat } from "../types/image.types"

export const MAX_TELEGRAM_PHOTO_BYTES = 10 * 1024 * 1024

export const DEFAULT_IMAGE_FORMATS = [
  "jpeg",
  "png",
  "webp",
] as const satisfies readonly ImageFormat[]

export const IMAGE_MIME_TYPES: Readonly<Record<ImageFormat, string>> =
  Object.freeze({
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  })

/**
 * Inspects binary magic bytes to identify JPEG, PNG, or WebP images
 * regardless of file extension.
 */
export function detectImageFormat(buffer: Uint8Array): ImageFormat | null {
  if (
    buffer.byteLength >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpeg"
  }

  if (
    buffer.byteLength >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png"
  }

  if (
    buffer.byteLength >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return "webp"
  }

  return null
}

/**
 * Validates that an image buffer is non-empty, within Telegram's photo byte
 * limit, and matches one of the allowed binary formats.
 */
export function validateImageBuffer(
  key: string,
  buffer: Uint8Array,
  options: {
    readonly maxBytes?: number
    readonly allowedFormats?: readonly ImageFormat[]
  } = {}
): ImageFormat {
  const maxBytes = options.maxBytes ?? MAX_TELEGRAM_PHOTO_BYTES
  const allowedFormats = options.allowedFormats ?? DEFAULT_IMAGE_FORMATS

  if (buffer.byteLength === 0) {
    throw new BotifyPluginError(
      "INVALID_IMAGE",
      `Image "${key}" is empty (0 bytes).`
    )
  }

  if (buffer.byteLength > maxBytes) {
    throw new BotifyPluginError(
      "INVALID_IMAGE",
      `Image "${key}" is ${buffer.byteLength} bytes; maximum allowed is ${maxBytes} bytes.`
    )
  }

  const format = detectImageFormat(buffer)
  if (!format) {
    throw new BotifyPluginError(
      "INVALID_IMAGE",
      `Image "${key}" has an unrecognized binary header (expected JPEG, PNG, or WebP).`
    )
  }

  if (!allowedFormats.includes(format)) {
    throw new BotifyPluginError(
      "INVALID_IMAGE",
      `Image "${key}" has format "${format}", which is not allowed (allowed: ${allowedFormats.join(", ")}).`
    )
  }

  return format
}
