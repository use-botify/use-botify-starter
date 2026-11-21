import { escapeHtml, getErrorMessage } from "@workspace/utils"
import { type CommandContext, Composer, type Context } from "grammy"

import { BotifyPluginError } from "../lib/errors"
import type {
  CreateIconToolsPluginOptions,
  ExtractedCustomEmoji,
  IconToolCommandDefinition,
  IconToolEntry,
  IconToolsPlugin,
} from "../types/icon-tools.types"
import {
  extractCustomEmoji,
  fetchIconStickerDetail,
  normalizeIconKey,
  renderCustomEmojiTag,
  resolveCandidateKey,
} from "./extract-emoji"

const DEFAULT_ADD_COMMAND = "add_icon"
const DEFAULT_LIST_COMMAND = "list_icons"
const DEFAULT_REMOVE_COMMAND = "remove_icon"
const MAX_TELEGRAM_MESSAGE_LENGTH = 4096
const COMMAND_NAME_PATTERN = /^[a-z0-9_]{1,32}$/

function assertValidCommandName(label: string, name: string): string {
  if (!COMMAND_NAME_PATTERN.test(name)) {
    throw new BotifyPluginError(
      "INVALID_PLUGIN_CONFIG",
      `Invalid ${label} command name "${name}": must be 1-32 lowercase letters, digits, or underscores.`
    )
  }

  return name
}

function extractExplicitKeyArg<C extends Context>(
  ctx: CommandContext<C>,
  inlineEmoji: ExtractedCustomEmoji | null
): string | undefined {
  const text = ctx.msg.text
  if (inlineEmoji?.entity && text) {
    const commandEntity = ctx.msg.entities?.find(
      (entity) => entity.type === "bot_command" && entity.offset === 0
    )
    const argsStart = commandEntity ? commandEntity.length : 0
    const { offset, length } = inlineEmoji.entity

    const before = text.slice(argsStart, Math.max(argsStart, offset))
    const after = text.slice(offset + length)
    const combined = `${before} ${after}`.trim()

    return combined.length > 0 ? combined : undefined
  }

  const rawMatch = ctx.match.trim()
  return rawMatch.length > 0 ? rawMatch : undefined
}

function chunkLines(
  header: string,
  lines: readonly string[],
  maxLength = MAX_TELEGRAM_MESSAGE_LENGTH
): string[] {
  const chunks: string[] = []
  let current = header

  for (const line of lines) {
    const candidate = current.length > 0 ? `${current}\n${line}` : line

    if (candidate.length > maxLength && current.length > 0) {
      chunks.push(current)
      current = line
    } else {
      current = candidate
    }
  }

  if (current.length > 0) {
    chunks.push(current)
  }

  return chunks
}

/**
 * Creates a reusable icon-management plugin providing `/add_icon`,
 * `/list_icons`, and `/remove_icon` commands backed by any `IconToolsStore`.
 */
export function createIconToolsPlugin<C extends Context = Context>(
  options: CreateIconToolsPluginOptions
): IconToolsPlugin<C> {
  const { store } = options
  const logger = options.logger === false ? undefined : options.logger
  const shouldFetchSticker = options.fetchStickerDetails !== false
  const showInMenu = options.showInMenu ?? true

  const addName = assertValidCommandName(
    "add",
    options.commandNames?.add ?? DEFAULT_ADD_COMMAND
  )
  const listName = assertValidCommandName(
    "list",
    options.commandNames?.list ?? DEFAULT_LIST_COMMAND
  )
  const removeName = assertValidCommandName(
    "remove",
    options.commandNames?.remove ?? DEFAULT_REMOVE_COMMAND
  )

  const uniqueNames = new Set([addName, listName, removeName])
  if (uniqueNames.size !== 3) {
    throw new BotifyPluginError(
      "INVALID_PLUGIN_CONFIG",
      "Icon tool command names (add, list, remove) must be distinct."
    )
  }

  const addDescription =
    options.commandDescriptions?.add ?? "Register a custom Telegram emoji icon"
  const listDescription =
    options.commandDescriptions?.list ?? "List registered custom emoji icons"
  const removeDescription =
    options.commandDescriptions?.remove ??
    "Remove a registered custom emoji icon"

  const handleAddIcon = async (ctx: CommandContext<C>): Promise<void> => {
    const inlineEmoji = extractCustomEmoji(ctx.msg)
    const repliedEmoji = inlineEmoji
      ? null
      : extractCustomEmoji(ctx.msg.reply_to_message)
    const captured = inlineEmoji ?? repliedEmoji

    if (!captured) {
      await ctx.reply(
        [
          "<b>No custom Telegram emoji found.</b>",
          "",
          `Send <code>/${escapeHtml(addName)} &lt;key&gt; &lt;custom_emoji&gt;</code>, or reply to a message containing a custom emoji with <code>/${escapeHtml(addName)} &lt;key&gt;</code>.`,
        ].join("\n"),
        { parse_mode: "HTML" }
      )
      return
    }

    let sticker = captured.sticker
    if (!sticker && shouldFetchSticker) {
      try {
        sticker = await fetchIconStickerDetail(ctx.api, captured.customEmojiId)
      } catch (error: unknown) {
        logger?.warn(
          "IconTools",
          "Could not fetch custom emoji sticker details",
          {
            customEmojiId: captured.customEmojiId,
            error: getErrorMessage(error),
          }
        )
      }
    }

    const explicitKeyArg = extractExplicitKeyArg(ctx, inlineEmoji)
    const key = resolveCandidateKey(
      captured.customEmojiId,
      explicitKeyArg,
      sticker
    )

    if (explicitKeyArg && normalizeIconKey(explicitKeyArg).length === 0) {
      await ctx.reply(
        `Invalid icon key <code>${escapeHtml(explicitKeyArg)}</code>. Use letters, digits, or underscores.`,
        { parse_mode: "HTML" }
      )
      return
    }

    const overwritten = store.has(key)
    const entry: IconToolEntry = Object.freeze<IconToolEntry>({
      key,
      customEmojiId: captured.customEmojiId,
      fallback: captured.fallback,
      capturedAt: new Date().toISOString(),
      entity: captured.entity,
      sticker,
      receivedMessage: captured.receivedMessage,
    })

    try {
      store.set(key, entry)
      await store.persist()
    } catch (error: unknown) {
      const reason = getErrorMessage(error)
      logger?.error("IconTools", "Failed to save custom emoji icon", {
        key,
        customEmojiId: entry.customEmojiId,
        error: reason,
      })

      await ctx.reply(
        `Failed to save icon <code>${escapeHtml(key)}</code>: ${escapeHtml(reason)}`,
        { parse_mode: "HTML" }
      )
      return
    }

    logger?.info("IconTools", overwritten ? "Updated icon" : "Added icon", {
      key,
      customEmojiId: entry.customEmojiId,
      overwritten,
    })

    await options.onIconSaved?.(entry, overwritten)

    const preview = renderCustomEmojiTag(entry.customEmojiId, entry.fallback)
    const actionLabel = overwritten ? "Updated" : "Saved"

    await ctx.reply(
      [
        `${preview} <b>${actionLabel} icon</b> <code>${escapeHtml(key)}</code>`,
        `ID: <code>${escapeHtml(entry.customEmojiId)}</code>`,
      ].join("\n"),
      { parse_mode: "HTML" }
    )
  }

  const handleListIcons = async (ctx: CommandContext<C>): Promise<void> => {
    const allIcons = store.getAll()
    const entries = Object.values(allIcons)

    if (entries.length === 0) {
      await ctx.reply(
        `No custom icons registered yet. Use <code>/${escapeHtml(addName)} &lt;key&gt; &lt;emoji&gt;</code> to add one.`,
        { parse_mode: "HTML" }
      )
      return
    }

    const header = `<b>Registered Icons (${entries.length})</b>\n`
    const lines = entries.map((entry) => {
      const tag = renderCustomEmojiTag(entry.customEmojiId, entry.fallback)
      return `${tag} <code>${escapeHtml(entry.key)}</code> — <code>${escapeHtml(entry.customEmojiId)}</code>`
    })

    const chunks = chunkLines(header, lines)
    for (const chunk of chunks) {
      await ctx.reply(chunk, { parse_mode: "HTML" })
    }
  }

  const handleRemoveIcon = async (ctx: CommandContext<C>): Promise<void> => {
    const rawKey = ctx.match.trim()
    if (rawKey.length === 0) {
      await ctx.reply(
        `Usage: <code>/${escapeHtml(removeName)} &lt;key&gt;</code>`,
        { parse_mode: "HTML" }
      )
      return
    }

    const exact = store.get(rawKey)
    const normalized = normalizeIconKey(rawKey)
    const targetKey = exact ? rawKey : normalized
    const existing = exact ?? (normalized ? store.get(normalized) : undefined)

    if (!existing) {
      await ctx.reply(
        `Icon <code>${escapeHtml(rawKey)}</code> was not found.`,
        { parse_mode: "HTML" }
      )
      return
    }

    store.remove(targetKey)

    try {
      await store.persist()
    } catch (error: unknown) {
      store.set(targetKey, existing)
      const reason = getErrorMessage(error)
      logger?.error("IconTools", "Failed to persist icon removal", {
        key: targetKey,
        error: reason,
      })

      await ctx.reply(
        `Failed to remove icon <code>${escapeHtml(targetKey)}</code>: ${escapeHtml(reason)}`,
        { parse_mode: "HTML" }
      )
      return
    }

    logger?.info("IconTools", "Removed icon", { key: targetKey })
    await options.onIconRemoved?.(targetKey, existing)

    await ctx.reply(
      `Removed icon <code>${escapeHtml(targetKey)}</code> (<code>${escapeHtml(existing.customEmojiId)}</code>).`,
      { parse_mode: "HTML" }
    )
  }

  const commands = Object.freeze<readonly IconToolCommandDefinition<C>[]>([
    Object.freeze({
      name: addName,
      description: addDescription,
      showInMenu,
      handler: handleAddIcon,
    }),
    Object.freeze({
      name: listName,
      description: listDescription,
      showInMenu,
      handler: handleListIcons,
    }),
    Object.freeze({
      name: removeName,
      description: removeDescription,
      showInMenu,
      handler: handleRemoveIcon,
    }),
  ])

  const composer = new Composer<C>()
  for (const command of commands) {
    composer.command(command.name, command.handler)
  }

  return Object.freeze<IconToolsPlugin<C>>({
    store,
    composer,
    middleware: composer.middleware(),
    commands,
    handleAddIcon,
    handleListIcons,
    handleRemoveIcon,
  })
}
