import { defineCallbackRoute } from "@/core";

/**
 * Kept apart from developer.feature.ts so handlers can import the routes
 * (to build inline keyboards) without importing the feature that imports them.
 */
export const DEVELOPER_ROUTES = {
	devtools: defineCallbackRoute("developer:devtools"),
	back: defineCallbackRoute("developer:back"),
	close: defineCallbackRoute("developer:close"),
} as const;
