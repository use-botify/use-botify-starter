export type ToolingErrorCode =
  | "INVALID_TOOLING_CONFIG"
  | "FILE_WRITE_FAILED"
  | "CODEGEN_FAILED"
  | "INVALID_ICON_REGISTRY"
  | "HMR_INIT_FAILED"
  | "HMR_RELOAD_FAILED"

export type ToolingLogMeta = Readonly<Record<string, unknown>>

export interface ToolingLogger {
  debug(scope: string, message: string, meta?: ToolingLogMeta): void
  info(scope: string, message: string, meta?: ToolingLogMeta): void
  warn(scope: string, message: string, meta?: ToolingLogMeta): void
  error(scope: string, message: string, meta?: ToolingLogMeta): void
  fatal(scope: string, message: string, meta?: ToolingLogMeta): void
}

export interface WriteIfChangedResult {
  readonly filePath: string
  readonly written: boolean
  readonly bytes: number
}
