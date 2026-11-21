export type PluginErrorCode =
  | "INVALID_PLUGIN_CONFIG"
  | "IMAGE_LOAD_FAILED"
  | "IMAGE_NOT_FOUND"
  | "INVALID_IMAGE"
  | "ICON_SAVE_FAILED"
  | "ICON_PERSIST_FAILED"

export type PluginLogMeta = Readonly<Record<string, unknown>>

export interface PluginLogger {
  debug(scope: string, message: string, meta?: PluginLogMeta): void
  info(scope: string, message: string, meta?: PluginLogMeta): void
  warn(scope: string, message: string, meta?: PluginLogMeta): void
  error(scope: string, message: string, meta?: PluginLogMeta): void
  fatal(scope: string, message: string, meta?: PluginLogMeta): void
}
