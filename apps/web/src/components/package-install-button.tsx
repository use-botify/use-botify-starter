"use client"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

interface PackageInstallButtonProps {
  readonly command: string
  readonly packageName: string
  readonly className?: string
}

export function PackageInstallButton({
  command,
  packageName,
  className,
}: PackageInstallButtonProps) {
  const { hasCopied, copy } = useCopyToClipboard(2000)

  return (
    <button
      type="button"
      data-copied={hasCopied}
      aria-label={
        hasCopied
          ? `Copied install command for ${packageName}`
          : `Copy install command for ${packageName}: ${command}`
      }
      onClick={() => void copy(command)}
      className={cn(
        "group/install flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-background/80 px-3 py-2 text-left font-mono text-xs text-muted-foreground transition-colors select-none",
        "hover:border-muted-foreground/50 hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50",
        className
      )}
    >
      <span className="truncate">
        <span aria-hidden="true" className="mr-1.5 text-green-400">
          $
        </span>
        {command}
      </span>

      <span className="relative size-3.5 shrink-0" aria-hidden="true">
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
            "absolute inset-0 text-muted-foreground transition-all duration-200 group-hover/install:text-foreground",
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
            "absolute inset-0 text-green-400 transition-all duration-200",
            hasCopied
              ? "scale-100 rotate-0 opacity-100"
              : "scale-75 -rotate-90 opacity-0"
          )}
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    </button>
  )
}
