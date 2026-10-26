import { defineCallback, defineFeature } from "@/configs/feature.config";
import { defineCallbackRoute } from "@/lib/callback-route";

export const ADMIN_ROUTES = {
	refresh: defineCallbackRoute("admin:refresh"),
} as const;

export const adminFeature = defineFeature({
	name: "admin",
	access: "admin",
	commands: [
		{
			name: "stats",
			description: "Admin bot statistics",
			access: "admin",
			handler: async (ctx) => {
				await ctx.reply("ADMIN Stats…");
			},
		},
	],
	callbacks: [
		defineCallback({
			route: ADMIN_ROUTES.refresh,
			access: "admin",
			handler: async (ctx) => {
				await ctx.editMessageText("Admin Refreshed callback");
			},
		}),
	],
});
