import { cache, Suspense } from "react"

import { CommandPill } from "@/components/command-pill"
import {
  EcosystemGrid,
  EcosystemGridFallback,
} from "@/components/ecosystem-grid"
import { BOTIFY_PACKAGES } from "@/lib/ecosystem"
import { fetchEcosystemNpmStats, formatDownloadCount } from "@/lib/npm-stats"

const getCachedEcosystemStats = cache(() => fetchEcosystemNpmStats())

const WORKFLOW_PILLARS = [
  {
    step: "01",
    title: "Scaffold in Seconds",
    description:
      "Run create-use-botify to wire TypeScript, Biome, Zod env validation, custom aliases, and optional admin/developer tiers.",
  },
  {
    step: "02",
    title: "File-Based Routing",
    description:
      "Drop command.ts and *.callback.ts files inside features/ with (admin) route groups and dynamic [param] callback matching.",
  },
  {
    step: "03",
    title: "Zero-Restart HMR",
    description:
      "Edit feature handlers live via Vite SSR while database pools, loggers, and Telegram polling stay connected.",
  },
] as const

async function DownloadsBadge() {
  const { totalDownloads } = await getCachedEcosystemStats()

  return (
    <span className="mb-4 inline-flex items-center justify-center gap-2 rounded-2xl border bg-foreground/10 px-3.5 py-1.5 font-mono text-sm text-muted-foreground">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-green-400" />
      {totalDownloads !== null
        ? `${formatDownloadCount(totalDownloads)} downloads last month`
        : `${BOTIFY_PACKAGES.length} open-source packages live on npm`}
    </span>
  )
}

function DownloadsBadgeFallback() {
  return (
    <span
      aria-hidden="true"
      className="mb-4 inline-flex h-8.5 w-56 animate-pulse rounded-2xl border bg-foreground/10"
    />
  )
}

async function EcosystemSection() {
  const stats = await getCachedEcosystemStats()
  return <EcosystemGrid byPackage={stats.byPackage} />
}

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="flex min-h-[86vh] items-center justify-center pt-20 pb-12">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <Suspense fallback={<DownloadsBadgeFallback />}>
            <DownloadsBadge />
          </Suspense>

          <h1 className="mb-2 font-mono text-2xl leading-tight font-semibold tracking-wide sm:mb-3 sm:text-5xl">
            Production Telegram Bots
            <br />
            scaffolded in seconds
          </h1>

          <p className="max-w-2xl px-3 text-sm text-muted-foreground sm:text-lg">
            A modular CLI and typed TypeScript framework for grammY — with
            Next.js-style file routing, Vite feature HMR, custom emoji icons,
            and zero boilerplate.
          </p>

          <CommandPill />

          <p className="mt-5 font-mono text-xs text-muted-foreground">
            {BOTIFY_PACKAGES.length} packages live on npm →{" "}
            <a
              href="#packages"
              className="text-foreground underline decoration-muted-foreground/50 underline-offset-4 transition-colors hover:decoration-foreground"
            >
              explore ecosystem
            </a>
          </p>
        </div>
      </section>

      <section
        aria-label="How Use Botify works"
        className="border-t py-14 sm:py-16"
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {WORKFLOW_PILLARS.map((pillar) => (
            <div key={pillar.step} className="space-y-2">
              <span className="font-mono text-xs text-green-400">
                {pillar.step}
              </span>
              <h2 className="font-mono text-base font-semibold text-foreground">
                {pillar.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="packages" className="scroll-mt-24 border-t py-14 sm:py-20">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs tracking-wider text-green-400 uppercase">
              Ecosystem
            </p>
            <h2 className="mt-1 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
              Modular by design
            </h2>
          </div>

          <p className="max-w-md text-sm text-muted-foreground">
            Start with the interactive CLI or install individual packages into
            any existing grammY TypeScript project.
          </p>
        </div>

        <Suspense fallback={<EcosystemGridFallback />}>
          <EcosystemSection />
        </Suspense>
      </section>
    </div>
  )
}
