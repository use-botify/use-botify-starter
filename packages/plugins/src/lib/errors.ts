import type { PluginErrorCode } from "../types/plugin.types"

export class BotifyPluginError extends Error {
  readonly code: PluginErrorCode

  constructor(code: PluginErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "BotifyPluginError"
    this.code = code
  }
}
