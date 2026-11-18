import { defineCallbackRoute } from "@/core"

/**
 * Kept apart from public.feature.ts so handlers can import the routes
 * (to build inline keyboards) without importing the feature that imports them.
 */
export const PUBLIC_ROUTES = {
  start: defineCallbackRoute("public:start"),
  back: defineCallbackRoute("public:back"),
  close: defineCallbackRoute("public:close"),
} as const
