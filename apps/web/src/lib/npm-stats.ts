import {
  BOTIFY_PACKAGES,
  type BotifyPackageName,
  TRACKED_PACKAGES,
} from "./ecosystem"

const NPM_DOWNLOADS_API = "https://api.npmjs.org/downloads/point/last-month"
const REVALIDATE_SECONDS = 3600
const FETCH_TIMEOUT_MS = 4000

interface NpmPointResponse {
  readonly downloads?: unknown
}

export interface PackageDownloadStat {
  readonly packageName: BotifyPackageName
  readonly downloads: number | null
}

export interface EcosystemNpmStats {
  /** Sum across reachable packages, or `null` if npm could not be reached. */
  readonly totalDownloads: number | null
  readonly byPackage: Readonly<Record<BotifyPackageName, number | null>>
  readonly packages: readonly PackageDownloadStat[]
}

function buildPackageUrl(packageName: string): string {
  const encodedPath = packageName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${NPM_DOWNLOADS_API}/${encodedPath}`
}

async function fetchPackageMonthlyDownloads(
  packageName: BotifyPackageName
): Promise<PackageDownloadStat> {
  try {
    const response = await fetch(buildPackageUrl(packageName), {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      return { packageName, downloads: null }
    }

    const data = (await response.json()) as NpmPointResponse
    const downloads =
      typeof data.downloads === "number" && Number.isFinite(data.downloads)
        ? data.downloads
        : null

    return { packageName, downloads }
  } catch {
    return { packageName, downloads: null }
  }
}

/**
 * Fetches last-30-day npm downloads for every published Botify package in
 * parallel and aggregates the ecosystem total.
 */
export async function fetchEcosystemNpmStats(
  packageNames: readonly BotifyPackageName[] = TRACKED_PACKAGES
): Promise<EcosystemNpmStats> {
  const settled = await Promise.allSettled(
    packageNames.map((name) => fetchPackageMonthlyDownloads(name))
  )

  const packages: PackageDownloadStat[] = []
  const byPackage = Object.fromEntries(
    BOTIFY_PACKAGES.map((pkg) => [pkg.name, null])
  ) as Record<BotifyPackageName, number | null>

  let total = 0
  let reachableCount = 0

  for (let i = 0; i < packageNames.length; i += 1) {
    const name = packageNames[i]
    const result = settled[i]
    if (!name) {
      continue
    }

    const downloads =
      result && result.status === "fulfilled" ? result.value.downloads : null

    byPackage[name] = downloads
    packages.push({ packageName: name, downloads })

    if (downloads !== null) {
      total += downloads
      reachableCount += 1
    }
  }

  return {
    totalDownloads: reachableCount > 0 ? total : null,
    byPackage,
    packages,
  }
}

const numberFormatter = new Intl.NumberFormat("en-US")

export function formatDownloadCount(count: number): string {
  return numberFormatter.format(count)
}
