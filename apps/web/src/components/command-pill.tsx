"use client"

import { useState } from "react"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

const COMMANDS = {
  pnpm: "pnpm dlx create-use-botify@latest",
  npm: "npx create-use-botify@latest",
} as const

type PackageManager = keyof typeof COMMANDS

const PACKAGE_MANAGERS: readonly PackageManager[] = ["pnpm", "npm"]

export function CommandPill() {
  const [pm, setPm] = useState<PackageManager>("pnpm")
  const { hasCopied, copy } = useCopyToClipboard(2500)

  const command = COMMANDS[pm]

  return (
    <div className="mt-6 flex flex-col items-center gap-2.5 sm:mt-8">
      <div
        role="tablist"
        aria-label="Package manager"
        className="inline-flex items-center gap-1 rounded-full border bg-background/60 p-1 font-mono text-xs"
      >
        {PACKAGE_MANAGERS.map((manager) => {
          const isActive = pm === manager
          return (
            <button
              key={manager}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setPm(manager)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 transition-colors",
                isActive
                  ? "bg-foreground/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {manager}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        data-cmd={command}
        data-copied={hasCopied}
        aria-label={hasCopied ? "Command copied" : `Copy command: ${command}`}
        onClick={() => void copy(command)}
        className={cn(
          "flex cursor-pointer items-center gap-2.5 rounded-full border bg-background/80 px-7 py-4 font-mono text-sm text-muted-foreground transition-all duration-200 select-none",
          "hover:scale-[1.02] hover:border-muted-foreground/60 hover:text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50",
          "[&_svg]:size-4 [&_svg]:shrink-0"
        )}
      >
        <span aria-hidden="true" className="text-indigo-400">
          $
        </span>
        <span>{command}</span>
        <span className="relative size-4" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn(
              "absolute inset-0 text-foreground transition-all duration-300 ease-in-out",
              hasCopied
                ? "scale-75 rotate-90 opacity-0"
                : "scale-100 rotate-0 opacity-100"
            )}
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn(
              "absolute inset-0 text-green-400 transition-all duration-300 ease-in-out",
              hasCopied
                ? "scale-100 rotate-0 opacity-100"
                : "scale-75 -rotate-90 opacity-0"
            )}
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      </button>

      <span className="sr-only" aria-live="polite">
        {hasCopied ? `Copied ${command} to clipboard` : ""}
      </span>
    </div>
  )
}
