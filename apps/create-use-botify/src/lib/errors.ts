import type { CreateBotifyErrorCode } from "../types/cli.types"

export class CreateBotifyError extends Error {
  readonly code: CreateBotifyErrorCode

  constructor(
    code: CreateBotifyErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "CreateBotifyError"
    this.code = code
  }
}
