import { defineCallbackRoute } from "@/core";

/**
 * Kept apart from developer.feature.ts so handlers can import the routes
 * (to build inline keyboards) without importing the feature that imports them.
 *
 * `command_name` is the guide id: it matches a key in developer.guide.ts.
 */
export const DEVELOPER_ROUTES = {
	devtools: defineCallbackRoute("developer:devtools"),
	devtools_guide: defineCallbackRoute("developer:devtools_guide"),
	close: defineCallbackRoute("developer:close"),
	guide: defineCallbackRoute("developer:guide:{command_name}"),
	execute: defineCallbackRoute("developer:execute:{command_name}"),
} as const;
