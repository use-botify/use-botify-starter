import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { type Context, GrammyError, InputFile } from "grammy"
import type { Message } from "grammy/types"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createImagePlugin,
  detectImageFormat,
  validateImageBuffer,
} from "../src/images"
import { BotifyPluginError } from "../src/index"

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
])
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const WEBP_BYTES = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
])

const tempDirs: string[] = []

async function createTempAssetsDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "botify-plugins-images-"))
  tempDirs.push(dir)
  return dir
}

function createPhotoMessage(fileId: string): Message.PhotoMessage {
  return {
    message_id: 1,
    date: 1_700_000_000,
    chat: { id: 1, type: "private", first_name: "Test" },
    photo: [
      {
        file_id: `${fileId}_small`,
        file_unique_id: "u1",
        width: 90,
        height: 90,
      },
      { file_id: fileId, file_unique_id: "u2", width: 800, height: 600 },
    ],
  }
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) {
      await rm(dir, { recursive: true, force: true })
    }
  }
})

describe("detectImageFormat & validateImageBuffer", () => {
  it("detects JPEG, PNG, and WebP magic headers and rejects invalid buffers", () => {
    expect(detectImageFormat(JPEG_BYTES)).toBe("jpeg")
    expect(detectImageFormat(PNG_BYTES)).toBe("png")
    expect(detectImageFormat(WEBP_BYTES)).toBe("webp")
    expect(detectImageFormat(Buffer.from("plain text"))).toBeNull()

    expect(validateImageBuffer("banner", PNG_BYTES)).toBe("png")
    expect(() => validateImageBuffer("empty", Buffer.alloc(0))).toThrow(
      BotifyPluginError
    )
    expect(() =>
      validateImageBuffer("large", PNG_BYTES, { maxBytes: 4 })
    ).toThrow(BotifyPluginError)
    expect(() =>
      validateImageBuffer("banner", WEBP_BYTES, { allowedFormats: ["png"] })
    ).toThrow(BotifyPluginError)
  })
})

describe("createImagePlugin", () => {
  it("loads images, caches Telegram file_id, and retries once when a cached ID goes stale", async () => {
    const dir = await createTempAssetsDir()
    await writeFile(path.join(dir, "welcome.png"), PNG_BYTES)
    await writeFile(path.join(dir, "promo.jpg"), JPEG_BYTES)

    const images = createImagePlugin({
      assetsDir: dir,
      manifest: {
        welcome: "welcome.png",
        promo: "promo.jpg",
      },
      logger: false,
    })

    // Accessing before load() fails clearly
    expect(() => images.get("welcome")).toThrow(BotifyPluginError)

    const loaded = await images.load()
    expect(images.size).toBe(2)
    expect(loaded.welcome.format).toBe("png")
    expect(loaded.promo.mimeType).toBe("image/jpeg")

    const sentPhotos: (string | InputFile)[] = []
    const ctx = {
      replyWithPhoto: vi.fn(async (photo: string | InputFile) => {
        sentPhotos.push(photo)
        return createPhotoMessage("file_id_fresh_1")
      }),
    } as unknown as Context

    // First send uploads buffer and caches file_id
    await images.replyWithImage(ctx, "welcome", { caption: "Hi" })
    expect(sentPhotos[0]).toBeInstanceOf(InputFile)
    expect(images.getFileId("welcome")).toBe("file_id_fresh_1")

    // Second send reuses cached file_id
    await images.replyWithImage(ctx, "welcome")
    expect(sentPhotos[1]).toBe("file_id_fresh_1")

    // Stale file_id triggers automatic single retry with fresh InputFile
    let attempts = 0
    const sendPhoto = vi.fn(
      async (_chatId: number | string, photo: string | InputFile) => {
        attempts += 1
        if (attempts === 1) {
          throw new GrammyError(
            "Call to 'sendPhoto' failed!",
            {
              ok: false,
              error_code: 400,
              description:
                "Bad Request: wrong file identifier/HTTP URL specified",
            },
            "sendPhoto",
            {}
          )
        }
        expect(photo).toBeInstanceOf(InputFile)
        return createPhotoMessage("file_id_fresh_2")
      }
    )

    await images.sendImage({ sendPhoto }, 123, "welcome")
    expect(sendPhoto).toHaveBeenCalledTimes(2)
    expect(images.getFileId("welcome")).toBe("file_id_fresh_2")

    images.clearFileId("welcome")
    expect(images.getFileId("welcome")).toBeUndefined()
  })

  it("blocks path traversal outside assetsDir", async () => {
    const dir = await createTempAssetsDir()
    const nested = path.join(dir, "sub")
    await mkdir(nested, { recursive: true })
    await writeFile(path.join(dir, "outside.png"), PNG_BYTES)

    const images = createImagePlugin({
      assetsDir: nested,
      manifest: {
        escaped: "../outside.png",
      },
      logger: false,
    })

    await expect(images.load()).rejects.toMatchObject({
      name: "BotifyPluginError",
      code: "INVALID_PLUGIN_CONFIG",
    })
  })
})
