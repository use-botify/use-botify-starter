import Link from "next/link"

import { cn } from "@/lib/utils"

export function SiteFooter() {
  return (
    <footer className="relative mt-auto w-full place-content-center place-items-center">
      <div
        className={cn(
          "h-px w-full bg-size-[var(--height)_var(--width)] dark:bg-[linear-gradient(to_right,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]",
          "[mask:linear-gradient(to_left,var(--background)_var(--fade-stop),transparent),linear-gradient(to_right,var(--background)_var(--fade-stop),transparent),linear-gradient(black,black)]"
        )}
        style={
          {
            "--height": "5px",
            "--width": "1px",
            "--background": "#ffffff",
            "--fade-stop": "90%",
            "--color-dark": "rgba(255, 255, 255, 0.2)",
            WebkitMaskComposite: "exclude",
            maskComposite: "exclude",
          } as React.CSSProperties
        }
      />
      <div className="w-full place-items-center px-8 py-4 text-sm text-muted-foreground sm:flex sm:items-center sm:justify-between sm:py-6">
        <p>{new Date().getFullYear()} © Use Botify. All rights reserved.</p>
        <p>
          Designed &amp; developed by
          <Link
            href="https://sahilkumardev.com"
            target="_blank"
            rel="noreferrer"
            className="ml-1.5 font-mono tracking-wider text-green-400 transition-colors hover:text-foreground"
          >
            sahilkumardev
          </Link>
        </p>
      </div>
    </footer>
  )
}
