import { RootProvider } from "fumadocs-ui/provider/next"
import type { Metadata } from "next"
import "@/styles/globals.css"

import { inter, mono } from "@/lib/font"
import { SITE_CONFIG, SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_CONFIG.title,
    template: `%s · ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  keywords: [
    "use-botify",
    "create-use-botify",
    "telegram bot",
    "grammy",
    "typescript",
    "vite hmr",
    "telegram custom emoji",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_CONFIG.name,
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    creator: SITE_CONFIG.creator,
  },
  alternates: {
    canonical: "/",
  },
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
