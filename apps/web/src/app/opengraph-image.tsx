import { ImageResponse } from "next/og"

import { BOTIFY_PACKAGES } from "@/lib/ecosystem"
import { SITE_CONFIG } from "@/lib/site"

export const alt = SITE_CONFIG.title
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#0a0a0a",
        color: "#fafafa",
        padding: "64px 72px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        border: "1px solid #262626",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 9999,
              backgroundColor: "#4ade80",
            }}
          />
          <span>USE BOTIFY</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #262626",
            backgroundColor: "#141414",
            borderRadius: 9999,
            padding: "10px 20px",
            fontSize: 20,
            color: "#a3a3a3",
          }}
        >
          {BOTIFY_PACKAGES.length} packages · TypeScript &amp; grammY
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "980px",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
          }}
        >
          Production Telegram Bots scaffolded in seconds.
        </div>

        <div
          style={{
            fontSize: 26,
            lineHeight: 1.45,
            color: "#a3a3a3",
          }}
        >
          File-based routing, zero-restart Vite HMR, typed custom emoji icons,
          and strict Zod configs.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #262626",
          paddingTop: "28px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: 24,
            color: "#e5e5e5",
          }}
        >
          <span style={{ color: "#4ade80" }}>$</span>
          <span>pnpm create use-botify</span>
        </div>

        <div
          style={{
            fontSize: 20,
            color: "#737373",
          }}
        >
          use-botify · MIT
        </div>
      </div>
    </div>,
    { ...size }
  )
}
