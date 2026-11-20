import { Suspense } from "react";

import { CommandPill } from "@/components/command-pill";
import { formatDownloadCount, getTotalMonthlyDownloads } from "@/lib/npm";

const TRACKED_PACKAGES = ["@use-botify/icons", "create-use-botify"] as const;

async function DownloadsBadge() {
  const downloads = await getTotalMonthlyDownloads(TRACKED_PACKAGES);

  return (
    <span className="mb-4 inline-flex items-center justify-center rounded-2xl border bg-foreground/10 px-3.5 py-1.5 font-mono text-sm text-muted-foreground">
      {downloads !== null
        ? `${formatDownloadCount(downloads)} downloads last month`
        : "Open-source Telegram bot toolkit"}
    </span>
  );
}

function DownloadsBadgeFallback() {
  return (
    <span
      aria-hidden="true"
      className="mb-4 inline-flex h-8.5 w-52 animate-pulse rounded-2xl border bg-foreground/10"
    />
  );
}

export default function Home() {
  return (
    <section className="flex min-h-screen items-center justify-center px-4">
      <div className="flex max-w-3xl flex-col items-center text-center">
        <Suspense fallback={<DownloadsBadgeFallback />}>
          <DownloadsBadge />
        </Suspense>

        <h1 className="mb-1 font-mono text-2xl leading-tight font-semibold tracking-wide sm:mb-2.5 sm:text-5xl">
          Production Telegram Bots
          <br />
          scaffolded in seconds
        </h1>

        <p className="px-3 text-sm text-muted-foreground sm:text-lg">
          A modular CLI and typed toolkit for scaffolding TypeScript &amp;
          grammY Telegram bots - complete with custom icons, strict configs, and
          zero boilerplate.
        </p>

        <CommandPill />

        <p className="mt-4 font-mono text-xs text-muted-foreground">
          Icons package live →{" "}
          <a
            href="https://www.npmjs.com/package/@use-botify/icons"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline decoration-muted-foreground/50 underline-offset-4 transition-colors hover:decoration-foreground"
          >
            @use-botify/icons
          </a>
        </p>
      </div>
    </section>
  );
}
