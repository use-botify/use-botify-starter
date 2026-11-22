"use client"

import Link from "next/link"
import { useCallback, useRef, useSyncExternalStore } from "react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function useIsStuck(ref: React.RefObject<HTMLElement | null>) {
  const stuckRef = useRef(false)

  const subscribe = useCallback(
    (onChange: () => void) => {
      const el = ref.current
      if (!el) return () => {}

      const observer = new IntersectionObserver(([entry]) => {
        if (!entry) return
        const next = !entry.isIntersecting && entry.boundingClientRect.top < 0
        if (next !== stuckRef.current) {
          stuckRef.current = next
          onChange()
        }
      })
      observer.observe(el)
      return () => observer.disconnect()
    },
    [ref]
  )

  return useSyncExternalStore(
    subscribe,
    () => stuckRef.current,
    () => false
  )
}

export function SiteHeader() {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const stuck = useIsStuck(sentinelRef)

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />

      <div className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center sm:h-16">
        {stuck && (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -inset-x-2 top-0 -bottom-3 -z-10",
              "bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/65",
              "mask-[linear-gradient(to_bottom,black_70%,transparent)]",
              "transition-opacity duration-300 motion-reduce:transition-none"
            )}
          />
        )}
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center justify-center gap-x-2.5 font-mono [&_svg]:size-6 [&_svg]:shrink-0 sm:[&_svg]:size-7.5"
          >
            <svg
              viewBox="0 0 5844 5869"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              aria-hidden="true"
            >
              <g>
                <path d="M0.5,3494.499c0,1241.961 0,1216.732 0,1216.732l1159.469,1152.618l1187.5,3.025l-0.534,-1161.664l-1168.635,2.459l8.366,-1211.875l-1186.167,-1.295Z" />
                <path d="M25.988,2373.297c0,-1241.961 0,-1216.732 0,-1216.732l1159.469,-1152.618l1187.5,-3.025l-0.534,1161.664l-1168.635,-2.459l8.366,1211.875l-1186.167,1.295Z" />
                <path d="M5842.898,2372.875c0,-1241.961 0,-1216.732 0,-1216.732l-1159.469,-1152.618l-1187.5,-3.025l0.534,1161.664l1168.635,-2.459l-8.366,1211.875l1186.167,1.295Z" />
                <path d="M5817.713,3495.953c0,1241.961 0,1216.732 0,1216.732l-1159.469,1152.618l-1187.5,3.025l0.534,-1161.664l1168.635,2.459l-8.366,-1211.875l1186.167,-1.295Z" />
                <path d="M1633.965,2899.463l1291.473,-1288.855l1292.417,1289.715l-1298.735,1301.901l-1285.154,-1302.761Z" />
              </g>
            </svg>

            <p className="flex flex-col justify-center gap-4 pt-1.5">
              <span className="text-lg leading-0 sm:text-xl">Use Botify</span>
              <span className="text-xs leading-0 text-muted-foreground sm:text-sm">
                Telegram Toolkit
              </span>
            </p>
          </Link>

          <nav className="flex items-center gap-4">
            <a
              href="#packages"
              className="hidden font-mono text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
            >
              Packages
            </a>

            <Link
              href="/docs"
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </Link>

            <Link
              href="https://github.com/use-botify/use-botify-starter"
              target="_blank"
              rel="noreferrer"
              aria-label="Use Botify on GitHub"
              className={cn(
                buttonVariants({ size: "icon", variant: "secondary" }),
                "border"
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </Link>
          </nav>
        </header>
      </div>
    </>
  )
}
