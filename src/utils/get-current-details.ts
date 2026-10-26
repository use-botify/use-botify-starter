const INDIA_TIME_ZONE = "Asia/Kolkata";

const indiaDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: INDIA_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const indiaYearFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: INDIA_TIME_ZONE,
  year: "numeric",
});

export const getCurrentTime = (): number => Date.now();

export const getCurrentYear = (): number =>
  Number(indiaYearFormatter.format(getCurrentTime()));

export const getIndianDateTime = (
  timestamp: number = getCurrentTime(),
): string => {
  const parts: Record<string, string> = {};
  for (const { type, value } of indiaDateTimeFormatter.formatToParts(
    timestamp,
  )) {
    parts[type] = value;
  }
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
};
