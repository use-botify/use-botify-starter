export function checkToDatabaseTelegramUserId(telegramId: number): bigint {
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    throw new RangeError(`Invalid Telegram user ID: ${telegramId}`)
  }

  return BigInt(telegramId)
}

export function checkFromDatabaseTelegramUserId(dbId: bigint): number {
  const telegramId = Number(dbId)

  if (!Number.isSafeInteger(telegramId)) {
    throw new RangeError(`Database user ID is not a safe integer: ${dbId}`)
  }

  return telegramId
}
