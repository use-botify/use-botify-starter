import type { ToolingLogger, WriteIfChangedResult } from "./tooling.types"

export interface RouteTypegenFile {
  readonly kind: "command" | "callback" | "feature"
  readonly relativePath: string
  readonly featureName: string
  readonly access: string
  readonly commandName?: string
  readonly callbackPattern?: string
}

export interface GenerateRouteTypesOptions {
  /** Custom top-of-file comment banner. */
  readonly banner?: string
}

export interface WriteRouteTypesOptions extends GenerateRouteTypesOptions {
  /** Path to the bot's `features/` directory. */
  readonly featuresDir: string
  /** Destination path for the generated `.d.ts` file (e.g. `src/generated/routes.d.ts`). */
  readonly outputPath: string
  /** Fallback access tier when no `(tier)` route group wraps a file. Defaults to `"public"`. */
  readonly defaultAccess?: string
  /** File extensions to scan. Defaults to `@use-botify/router/fs` defaults. */
  readonly extensions?: readonly string[]
  /** Optional logger for codegen diagnostics. */
  readonly logger?: ToolingLogger | false
}

export interface RouteTypegenCounts {
  readonly features: number
  readonly commands: number
  readonly callbacks: number
}

export interface WriteRouteTypesResult extends WriteIfChangedResult {
  readonly counts: RouteTypegenCounts
}

export type IconStickerFormat = "static" | "animated" | "video"

export interface IconStickerDetail {
  readonly fileId: string
  readonly fileUniqueId: string
  readonly emoji: string | null
  readonly setName: string | null
  readonly stickerType: string
  readonly width: number
  readonly height: number
  readonly isAnimated: boolean
  readonly isVideo: boolean
  readonly format: IconStickerFormat
}

export interface IconEntityPosition {
  readonly offset: number
  readonly length: number
}

export interface IconSourceMessage {
  readonly messageId: number
  readonly chatId: string
  readonly isForwarded: boolean
  readonly forwardOriginType: string | null
}

export interface StoredIconEntry {
  readonly key: string
  readonly customEmojiId: string
  readonly fallback: string
  readonly capturedAt?: string
  readonly entity?: IconEntityPosition | null
  readonly sticker?: IconStickerDetail | null
  readonly receivedMessage?: IconSourceMessage
}

export interface GenerateIconRegistryTsOptions {
  /** Custom top-of-file comment banner. */
  readonly banner?: string
  /** Exported constant name for the icon dictionary. Defaults to `"CUSTOM_ICONS"`. */
  readonly exportName?: string
  /** Indentation string used inside generated literals. Defaults to `"  "`. */
  readonly indent?: string
}

export interface IconRegistryStoreOptions
  extends GenerateIconRegistryTsOptions {
  /** Path to the JSON source of truth (e.g. `src/registry/icons.registry.json`). */
  readonly jsonPath: string
  /** Optional path to auto-sync a typed TypeScript module (e.g. `src/registry/icons.registry.ts`). */
  readonly tsPath?: string
  /** Optional seed icons written when `jsonPath` does not exist yet. */
  readonly initialIcons?: Readonly<Record<string, StoredIconEntry>>
  /** Optional logger for load/persist diagnostics. */
  readonly logger?: ToolingLogger | false
}

export interface IconRegistryPersistResult {
  readonly count: number
  readonly json: WriteIfChangedResult
  readonly ts: WriteIfChangedResult | undefined
}

export interface IconRegistryStore {
  /** Number of icons currently loaded in memory. */
  readonly size: number
  /** Loads icons from `jsonPath` (creating seed files on `ENOENT`) and syncs `tsPath`. */
  load(): Promise<Readonly<Record<string, StoredIconEntry>>>
  /** Persists the current in-memory registry atomically to `jsonPath` and optional `tsPath`. */
  persist(): Promise<IconRegistryPersistResult>
  /** Returns a frozen snapshot of all stored icons sorted by key. */
  getAll(): Readonly<Record<string, StoredIconEntry>>
  /** Safe key lookup (`undefined` on miss or prototype key). */
  get(key: string): StoredIconEntry | undefined
  /** Checks whether a key exists in memory. */
  has(key: string): boolean
  /** Validates and stores an icon in memory (call `persist()` to write to disk). */
  set(key: string, entry: StoredIconEntry): StoredIconEntry
  /** Removes an icon in memory and returns `true` if it existed. */
  remove(key: string): boolean
}
