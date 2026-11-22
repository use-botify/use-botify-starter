import { PackageInstallButton } from "@/components/package-install-button"
import {
  BOTIFY_PACKAGES,
  type BotifyPackageKind,
  type BotifyPackageName,
} from "@/lib/ecosystem"
import { formatDownloadCount } from "@/lib/npm-stats"
import { cn } from "@/lib/utils"

const KIND_LABELS: Readonly<Record<BotifyPackageKind, string>> = {
  cli: "CLI",
  runtime: "Runtime",
  dev: "Dev Tooling",
  plugin: "Plugin",
}

const KIND_STYLES: Readonly<Record<BotifyPackageKind, string>> = {
  cli: "border-green-400/30 bg-green-400/10 text-green-400",
  runtime: "border-foreground/20 bg-foreground/10 text-foreground",
  dev: "border-border bg-muted/60 text-muted-foreground",
  plugin: "border-border bg-muted/40 text-muted-foreground",
}

interface EcosystemGridProps {
  readonly byPackage: Readonly<Record<BotifyPackageName, number | null>>
}

export function EcosystemGrid({ byPackage }: EcosystemGridProps) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-2 lg:grid-cols-3">
      {BOTIFY_PACKAGES.map((pkg) => {
        const downloads = byPackage[pkg.name]

        return (
          <article
            key={pkg.name}
            className="flex flex-col justify-between gap-5 bg-background/90 p-6 transition-colors hover:bg-background"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-wider uppercase",
                    KIND_STYLES[pkg.kind]
                  )}
                >
                  {KIND_LABELS[pkg.kind]}
                </span>

                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <span>v{pkg.version}</span>
                  {downloads !== null && (
                    <>
                      <span aria-hidden="true" className="text-border">
                        ·
                      </span>
                      <span>{formatDownloadCount(downloads)}/mo</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-mono text-base font-semibold tracking-tight text-foreground">
                  {pkg.name}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {pkg.summary}
                </p>
              </div>

              {pkg.entrypoints.length > 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pkg.entrypoints.map((entry) => (
                    <span
                      key={entry}
                      className="rounded border bg-foreground/5 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      {entry.replace(`${pkg.name}`, ".")}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <PackageInstallButton
                command={pkg.installCommand}
                packageName={pkg.name}
              />

              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <a
                  href={pkg.npmUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  npm ↗
                </a>
                <a
                  href={pkg.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  source ↗
                </a>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function EcosystemGridFallback() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-2 lg:grid-cols-3"
    >
      {BOTIFY_PACKAGES.map((pkg) => (
        <div
          key={pkg.name}
          className="flex h-64 flex-col justify-between bg-background/90 p-6"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="h-5 w-16 animate-pulse rounded-md bg-foreground/10" />
              <span className="h-4 w-20 animate-pulse rounded bg-foreground/10" />
            </div>
            <div className="h-5 w-44 animate-pulse rounded bg-foreground/10" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-full animate-pulse rounded bg-foreground/10" />
              <div className="h-3.5 w-4/5 animate-pulse rounded bg-foreground/10" />
            </div>
          </div>
          <div className="h-9 w-full animate-pulse rounded-lg bg-foreground/10" />
        </div>
      ))}
    </div>
  )
}
