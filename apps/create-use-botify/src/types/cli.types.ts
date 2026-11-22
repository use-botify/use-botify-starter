export type PackageManager = "pnpm" | "npm" | "yarn" | "bun"

export type CreateBotifyErrorCode =
  | "INVALID_CLI_ARGS"
  | "INVALID_OPTIONS"
  | "TARGET_NOT_EMPTY"
  | "SCAFFOLD_FAILED"
  | "POST_INSTALL_FAILED"
  | "PROMPT_CANCELLED"

export interface FeatureSelection {
  /** Include the `(admin)/panel` feature, admin guard, and `ADMIN_IDS` env var. */
  readonly admin: boolean
  /** Include the `(developer)/icons` feature (`@use-botify/icons` + icon-tools) and `DEVELOPER_IDS` env var. */
  readonly developer: boolean
  /** Include the `@use-botify/plugins/images` asset manifest & `file_id` caching plugin. */
  readonly images: boolean
}

export interface ScaffoldOptions {
  /** Raw project directory argument (e.g. `"my-bot"` or `"."`). */
  readonly projectName: string
  /** Valid npm package name derived from `projectName` (or cwd basename for `"."`). */
  readonly packageName: string
  /** Absolute path where the project will be generated. */
  readonly targetDir: string
  /** Place application source files under `src/`. Defaults to `true`. */
  readonly useSrcDir: boolean
  /** TypeScript / Vite path alias ending in `/*` (e.g. `"@/*"`). */
  readonly importAlias: string
  /** Enabled optional features and plugins. */
  readonly features: FeatureSelection
  /** Target package manager for install & next-step instructions. */
  readonly packageManager: PackageManager
  /** Run dependency installation after writing files. */
  readonly install: boolean
  /** Initialize a git repository after writing files. */
  readonly git: boolean
  /** Allow scaffolding into a non-empty target directory. */
  readonly overwrite: boolean
}

export interface ParsedCliArgs {
  readonly projectName?: string
  readonly yes: boolean
  readonly help: boolean
  readonly version: boolean
  readonly useSrcDir?: boolean
  readonly importAlias?: string
  readonly admin?: boolean
  readonly developer?: boolean
  readonly images?: boolean
  readonly packageManager?: PackageManager
  readonly install?: boolean
  readonly git?: boolean
  readonly overwrite: boolean
}

export interface GeneratedFile {
  /** POSIX-normalized path relative to `targetDir`. */
  readonly path: string
  /** UTF-8 file contents. */
  readonly content: string
}

export interface ScaffoldResult {
  readonly options: ScaffoldOptions
  readonly files: readonly GeneratedFile[]
  readonly installed: boolean
  readonly gitInitialized: boolean
}
