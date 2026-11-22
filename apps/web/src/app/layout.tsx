import { RootProvider } from "fumadocs-ui/provider/next"
import type { Metadata } from "next"
import "@/styles/globals.css"

import { inter, mono } from "@/lib/font"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: {
    default: "Use Botify — Modular TypeScript Framework for Telegram Bots",
    template: "%s · Use Botify",
  },
  description:
    "Scaffold production-ready, Next.js-style grammY Telegram bots with Vite feature HMR, file-based routing, typed custom emoji icons, and zero boilerplate.",
  keywords: [
    "use-botify",
    "create-use-botify",
    "telegram bot",
    "grammy",
    "typescript",
    "vite hmr",
    "telegram custom emoji",
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "dark font-inter leading-normal font-normal tracking-wide antialiased",
        mono.variable,
        inter.variable
      )}
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider
          theme={{
            defaultTheme: "dark",
            enableSystem: false,
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
