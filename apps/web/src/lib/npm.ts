const NPM_DOWNLOADS_API = "https://api.npmjs.org/downloads/point/last-month";
const REVALIDATE_SECONDS = 3600;
const FETCH_TIMEOUT_MS = 4000;

interface NpmDownloadResponse {
  downloads: number;
  package: string;
  start: string;
  end: string;
}

function isNpmDownloadResponse(value: unknown): value is NpmDownloadResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.downloads === "number" && Number.isFinite(record.downloads)
  );
}

function encodePackagePath(packageName: string): string {
  return packageName.split("/").map(encodeURIComponent).join("/");
}

export async function getMonthlyDownloads(
  packageName: string,
): Promise<number | null> {
  try {
    const response = await fetch(
      `${NPM_DOWNLOADS_API}/${encodePackagePath(packageName)}`,
      {
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );

    if (!response.ok) return null;

    const data: unknown = await response.json();
    return isNpmDownloadResponse(data) ? data.downloads : null;
  } catch {
    return null;
  }
}

export async function getTotalMonthlyDownloads(
  packageNames: readonly string[],
): Promise<number | null> {
  const results = await Promise.all(packageNames.map(getMonthlyDownloads));
  const validCounts = results.filter(
    (count): count is number => count !== null,
  );

  if (validCounts.length === 0) return null;

  return validCounts.reduce((total, count) => total + count, 0);
}

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatDownloadCount(count: number): string {
  return numberFormatter.format(count);
}
