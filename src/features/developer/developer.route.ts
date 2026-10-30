import { defineCallbackRoute } from "@/core";

/**
 * Kept apart from developer.feature.ts so handlers can import the routes
 * (to build inline keyboards) without importing the feature that imports them.
 */
export const DEVELOPER_ROUTES = {
	devtools: defineCallbackRoute("developer:devtools"),
	close: defineCallbackRoute("developer:close"),
	back: defineCallbackRoute("developer:back"),

	// Icons Callbacks
	guide: defineCallbackRoute("developer:guide:{command_name}"),
	execute: defineCallbackRoute("developer:execute:{command_name}"),
} as const;
