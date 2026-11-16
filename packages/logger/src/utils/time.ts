const formatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

// Indian format: date, a space, then 24-hour time. Example: 16/11/2026 14:05:09
export function getIndianDateTime(
  timestamp: number | Date = Date.now()
): string {
  const parts = Object.fromEntries(
    formatter.formatToParts(timestamp).map((part) => [part.type, part.value])
  )

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`
}
