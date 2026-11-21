import type { CommandContext, Composer, Context, MiddlewareFn } from "grammy";
import type { Message } from "grammy/types";

import type { PluginLogger } from "./plugin.types";

export type IconStickerFormat = "static" | "animated" | "video";

export interface IconStickerDetail {
  readonly fileId: string;
  readonly fileUniqueId: string;
  readonly emoji: string | null;
  readonly setName: string | null;
  readonly stickerType: string;
  readonly width: number;
  readonly height: number;
  readonly isAnimated: boolean;
  readonly isVideo: boolean;
  readonly format: IconStickerFormat;
}

export interface IconEntityPosition {
  readonly offset: number;
  readonly length: number;
}

export interface IconSourceMessage {
  readonly messageId: number;
  readonly chatId: string;
  readonly isForwarded: boolean;
  readonly forwardOriginType: string | null;
}

export interface IconToolEntry {
  readonly key: string;
  readonly customEmojiId: string;
  readonly fallback: string;
  readonly capturedAt?: string;
  readonly entity?: IconEntityPosition | null;
  readonly sticker?: IconStickerDetail | null;
  readonly receivedMessage?: IconSourceMessage;
}

/**
 * Minimal store contract structurally compatible with
 * `@use-botify/tooling/codegen`'s `IconRegistryStore`.
 */
export interface IconToolsStore {
  readonly size: number;
  getAll(): Readonly<Record<string, IconToolEntry>>;
  get(key: string): IconToolEntry | undefined;
  has(key: string): boolean;
  set(key: string, entry: IconToolEntry): IconToolEntry;
  remove(key: string): boolean;
  persist(): unknown;
}

export type InspectableEmojiMessage = Pick<
  Message,
  | "message_id"
  | "chat"
  | "text"
  | "caption"
  | "entities"
  | "caption_entities"
  | "sticker"
  | "forward_origin"
>;

export type ExtractedEmojiSource = "text" | "caption" | "sticker";

export interface ExtractedCustomEmoji {
  readonly customEmojiId: string;
  readonly fallback: string;
  readonly source: ExtractedEmojiSource;
  readonly entity: IconEntityPosition | null;
  readonly sticker: IconStickerDetail | null;
  readonly receivedMessage: IconSourceMessage;
}

export interface IconToolCommandNames {
  readonly add?: string;
  readonly list?: string;
  readonly remove?: string;
}

export interface IconToolCommandDescriptions {
  readonly add?: string;
  readonly list?: string;
  readonly remove?: string;
}

export interface IconToolCommandDefinition<C extends Context = Context> {
  readonly name: string;
  readonly description: string;
  readonly showInMenu?: boolean;
  readonly handler: (ctx: CommandContext<C>) => Promise<void>;
}

export interface CreateIconToolsPluginOptions {
  /** Store backing icon persistence (pass `createIconRegistryStore(...)` from `@use-botify/tooling/codegen`). */
  readonly store: IconToolsStore;
  /** Override default command names (`add_icon`, `list_icons`, `remove_icon`). */
  readonly commandNames?: IconToolCommandNames;
  /** Override default Telegram `/` menu descriptions. */
  readonly commandDescriptions?: IconToolCommandDescriptions;
  /** Fetch full sticker metadata via `api.getCustomEmojiStickers` when capturing an icon. Defaults to `true`. */
  readonly fetchStickerDetails?: boolean;
  /** Include commands in Telegram's `/` menu when mounted via `@use-botify/router`. Defaults to `true`. */
  readonly showInMenu?: boolean;
  /** Optional hook invoked after an icon is saved and persisted. */
  readonly onIconSaved?: (
    entry: IconToolEntry,
    overwritten: boolean,
  ) => void | Promise<void>;
  /** Optional hook invoked after an icon is removed and persisted. */
  readonly onIconRemoved?: (
    key: string,
    removed: IconToolEntry,
  ) => void | Promise<void>;
  /** Optional logger (compatible with `@use-botify/core`'s `CoreLogger`). */
  readonly logger?: PluginLogger | false;
}

export interface IconToolsPlugin<C extends Context = Context> {
  readonly store: IconToolsStore;
  readonly composer: Composer<C>;
  readonly middleware: MiddlewareFn<C>;
  /** Structurally compatible with `@use-botify/router`'s `CommandDefinition[]`. */
  readonly commands: readonly IconToolCommandDefinition<C>[];
  readonly handleAddIcon: (ctx: CommandContext<C>) => Promise<void>;
  readonly handleListIcons: (ctx: CommandContext<C>) => Promise<void>;
  readonly handleRemoveIcon: (ctx: CommandContext<C>) => Promise<void>;
}
