const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")

export const SITE_URL = rawSiteUrl.replace(/\/+$/, "")

export const SITE_CONFIG = {
  name: "Use Botify",
  title: "Use Botify — Modular TypeScript Framework for Telegram Bots",
  description:
    "Scaffold production-ready, Next.js-style grammY Telegram bots with Vite feature HMR, file-based routing, typed custom emoji icons, and zero boilerplate.",
  creator: "@sahilkumardev",
} as const
