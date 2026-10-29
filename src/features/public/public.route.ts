import { defineCallbackRoute } from "@/core";

/**
 * Kept apart from public.feature.ts so handlers can import the routes
 * (to build inline keyboards) without importing the feature that imports them.
 */
export const PUBLIC_ROUTES = {
  start: defineCallbackRoute("public:start"),
  cancel: defineCallbackRoute("public:cancel"),
  back: defineCallbackRoute("public:back"),
} as const;
