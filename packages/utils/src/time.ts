const IST_TIME_ZONE = "Asia/Kolkata";

const istFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// Formats a timestamp in IST as DD/MM/YYYY HH:mm:ss (e.g. 18/11/2026 23:36:09).
export function getIndianDateTime(
  timestamp: number | Date = Date.now(),
): string {
  const parts = new Map(
    istFormatter
      .formatToParts(timestamp)
      .map((part) => [part.type, part.value] as const),
  );

  const day = parts.get("day") ?? "00";
  const month = parts.get("month") ?? "00";
  const year = parts.get("year") ?? "0000";
  const hour = parts.get("hour") ?? "00";
  const minute = parts.get("minute") ?? "00";
  const second = parts.get("second") ?? "00";

  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return "0ms";
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(2)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (seconds === 60) {
    return `${minutes + 1}m 0s`;
  }

  return `${minutes}m ${seconds}s`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}
