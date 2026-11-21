import type { ToolingErrorCode } from "../types/tooling.types"

export class BotifyToolingError extends Error {
  readonly code: ToolingErrorCode

  constructor(code: ToolingErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "BotifyToolingError"
    this.code = code
  }
}
