import type { Plugin, ViteDevServer } from "vite"

import type { ToolingLogger } from "./tooling.types"

export type HmrModuleLoader = (
  filePath: string
) => Promise<Record<string, unknown>>

export interface HmrAlias {
  readonly find: string | RegExp
  readonly replacement: string
}

export interface ShareCoreModulesOptions {
  /** Absolute path to the project's source root (e.g. `src/`). */
  readonly sourceDir: string
  /** Absolute path to the hot-reloaded features directory (e.g. `src/features/`). */
  readonly featuresDir: string
  /** Regex matching TypeScript/JavaScript source files. Defaults to `/\.[cm]?tsx?$/`. */
  readonly scriptPattern?: RegExp
  /** Optional override to control which absolute POSIX file paths stay shared from Node. */
  readonly shouldShare?: (filePath: string) => boolean
  /** Global registry key used to expose shared modules inside Vite's SSR runner. */
  readonly sharedKey?: string
}

export interface HmrReloadContext {
  /** `true` on initial boot, `false` on subsequent file-watcher reloads. */
  readonly initial: boolean
  /** 1-based reload counter (`1` on initial load). */
  readonly reloadCount: number
  /** Normalized path of the file that triggered the reload, if any. */
  readonly changedFile: string | undefined
  /** Loads a fresh feature module through Vite's SSR module runner (compatible with `@use-botify/router/fs`). */
  readonly loadModule: HmrModuleLoader
  /** Underlying Vite dev server instance. */
  readonly server: ViteDevServer
}

export interface HmrErrorContext {
  readonly initial: boolean
  readonly changedFile: string | undefined
}

export interface StartFeatureHmrOptions {
  /** Project root directory. Defaults to `process.cwd()`. */
  readonly projectRoot?: string
  /** Source directory mapped to `aliasPrefix` and shared-core detection. Defaults to `<projectRoot>/src`. */
  readonly sourceDir?: string
  /** Directory watched for feature reloads. Defaults to `<sourceDir>/features`. */
  readonly featuresDir?: string
  /** Import alias prefix mapped to `sourceDir` (matches custom CLI alias). Defaults to `"@/"`. Set `false` to disable. */
  readonly aliasPrefix?: string | false
  /** Additional Vite resolve aliases. */
  readonly aliases?: readonly HmrAlias[]
  /** Debounce window in milliseconds before running a queued reload. Defaults to `150`. */
  readonly debounceMs?: number
  /** Share non-feature modules inside `sourceDir` with the host Node process. Defaults to `true`. */
  readonly shareCoreModules?: boolean
  /** Custom predicate for deciding whether a changed file triggers a reload. */
  readonly shouldReload?: (filePath: string) => boolean
  /** Additional Vite plugins appended after the core-sharing plugin. */
  readonly vitePlugins?: readonly Plugin[]
  /**
   * Invoked on initial boot and on every subsequent feature change.
   * Use `loadModule` with `@use-botify/router/fs` (`createFsRouter`) and swap via `createHmrDispatcher`.
   */
  readonly onReload: (context: HmrReloadContext) => void | Promise<void>
  /** Optional hook called when a non-initial reload fails (previous handlers stay active). */
  readonly onError?: (
    error: unknown,
    context: HmrErrorContext
  ) => void | Promise<void>
  /** Optional logger (compatible with `@use-botify/core`'s `CoreLogger`). */
  readonly logger?: ToolingLogger | false
}

export interface FeatureHmrController {
  /** Number of successful reloads completed so far. */
  readonly reloadCount: number
  /** Resolved absolute path to the watched `features/` directory. */
  readonly featuresDir: string
  /** Manually trigger a serialized reload (useful for scripts and tests). */
  reload(changedFile?: string): Promise<void>
  /** Stop file watching, wait for in-flight reloads, and close Vite cleanly. */
  close(): Promise<void>
}
