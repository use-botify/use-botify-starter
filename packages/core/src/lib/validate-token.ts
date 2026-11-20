import { getErrorMessage } from "@workspace/utils"
import type { Api } from "grammy"

import type { TokenVerificationResult } from "../types/core.types"
import { BotifyCoreError } from "./errors"

/**
 * Matches Telegram Bot API tokens (`<numeric_bot_id>:<secret>`).
 */
const BOT_TOKEN_PATTERN = /^\d{5,16}:[A-Za-z0-9_-]{20,64}$/

export function isValidBotToken(value: unknown): value is string {
  if (typeof value !== "string") {
    return false
  }

  return BOT_TOKEN_PATTERN.test(value.trim())
}

export function maskBotToken(token: string): string {
  const trimmed = token.trim()
  const separatorIndex = trimmed.indexOf(":")

  if (separatorIndex <= 0) {
    return "***"
  }

  const botId = trimmed.slice(0, separatorIndex)
  const secret = trimmed.slice(separatorIndex + 1)

  if (secret.length <= 6) {
    return `${botId}:***`
  }

  return `${botId}:${secret.slice(0, 3)}***${secret.slice(-3)}`
}

export function assertBotToken(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BotifyCoreError(
      "INVALID_BOT_TOKEN",
      "Bot token is missing. Provide a valid token from @BotFather."
    )
  }

  const trimmed = value.trim()

  if (!BOT_TOKEN_PATTERN.test(trimmed)) {
    throw new BotifyCoreError(
      "INVALID_BOT_TOKEN",
      `Bot token "${maskBotToken(trimmed)}" has an invalid format. Expected "<bot_id>:<secret>".`
    )
  }

  return trimmed
}

export async function verifyBotToken(
  api: Pick<Api, "getMe">,
  token: string
): Promise<TokenVerificationResult> {
  const validToken = assertBotToken(token)
  const maskedToken = maskBotToken(validToken)

  try {
    const botInfo = await api.getMe()
    return { botInfo, maskedToken }
  } catch (error: unknown) {
    throw new BotifyCoreError(
      "TOKEN_VERIFICATION_FAILED",
      `Telegram rejected bot token "${maskedToken}": ${getErrorMessage(error)}`,
      { cause: error }
    )
  }
}
