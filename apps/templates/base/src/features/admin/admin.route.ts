import { defineCallbackRoute } from "@/core"

/**
 * Kept apart from admin.feature.ts so handlers can import the routes
 * (to build inline keyboards) without importing the feature that imports them.
 */
export const ADMIN_ROUTES = {
  panel: defineCallbackRoute("admin:panel"),
  back: defineCallbackRoute("admin:back"),
  close: defineCallbackRoute("admin:close"),
} as const
