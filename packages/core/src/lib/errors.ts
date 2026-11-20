import type { CoreErrorCode } from "../types/core.types"

export class BotifyCoreError extends Error {
  readonly code: CoreErrorCode

  constructor(code: CoreErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "BotifyCoreError"
    this.code = code
  }
}
