import type { Api, Context, InputFile } from "grammy"
import type { Message } from "grammy/types"

import type { PluginLogger } from "./plugin.types"

export type ImageFormat = "jpeg" | "png" | "webp"

export type ImageManifest = Readonly<Record<string, string>>

export type ImageKey<TManifest extends ImageManifest> = Extract<
  keyof TManifest,
  string
>

export type ReplyPhotoOptions = Parameters<Context["replyWithPhoto"]>[1]

export type SendPhotoOptions = Parameters<Api["sendPhoto"]>[2]

export interface LoadedImage {
  readonly key: string
  readonly filePath: string
  readonly fileName: string
  readonly format: ImageFormat
  readonly mimeType: string
  readonly bytes: number
  readonly buffer: Buffer
}

export interface CreateImagePluginOptions<TManifest extends ImageManifest> {
  /** Base directory for relative paths declared in `manifest`. */
  readonly assetsDir: string
  /** Typed map of image keys to filenames relative to `assetsDir` (or absolute paths). */
  readonly manifest: TManifest
  /** Maximum allowed photo size in bytes. Defaults to Telegram's 10 MB limit (`10_485_760`). */
  readonly maxBytes?: number
  /** Allowed binary formats verified via magic bytes. Defaults to `["jpeg", "png", "webp"]`. */
  readonly allowedFormats?: readonly ImageFormat[]
  /** Optional pre-seeded `file_id` cache (e.g. restored from Redis or a database). */
  readonly initialFileIds?: Partial<Record<ImageKey<TManifest>, string>>
  /** Optional logger (compatible with `@use-botify/core`'s `CoreLogger`). */
  readonly logger?: PluginLogger | false
}

export interface ImagePlugin<TKey extends string = string> {
  /** All manifest keys registered with this plugin. */
  readonly keys: readonly TKey[]
  /** Number of images currently loaded in memory. */
  readonly size: number
  /** Reads and validates every image in `manifest` up front (fail-fast on startup). */
  load(): Promise<Readonly<Record<TKey, LoadedImage>>>
  /** Returns a loaded image buffer & metadata, throwing `IMAGE_NOT_FOUND` if missing or unloaded. */
  get(key: TKey): LoadedImage
  /** Checks whether `key` is declared in the plugin manifest. */
  has(key: string): key is TKey
  /** Returns the cached Telegram `file_id` for `key`, if available. */
  getFileId(key: TKey): string | undefined
  /** Manually seeds or updates a cached Telegram `file_id`. */
  setFileId(key: TKey, fileId: string): void
  /** Clears a single cached `file_id` or the entire cache when `key` is omitted. */
  clearFileId(key?: TKey): void
  /** Wraps the loaded buffer in a fresh grammY `InputFile`. */
  toInputFile(key: TKey): InputFile
  /** Replies with a cached `file_id` when available, retrying once as an upload if Telegram rejects the cached ID. */
  replyWithImage<C extends Context>(
    ctx: C,
    key: TKey,
    options?: ReplyPhotoOptions
  ): Promise<Message.PhotoMessage>
  /** Sends a photo via `bot.api` using the same `file_id` cache and stale-ID retry logic. */
  sendImage(
    api: Pick<Api, "sendPhoto">,
    chatId: number | string,
    key: TKey,
    options?: SendPhotoOptions
  ): Promise<Message.PhotoMessage>
}
