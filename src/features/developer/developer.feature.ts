import { defineCallback, defineFeature } from "@/configs/feature.config";
import { defineCallbackRoute } from "@/lib/callback-route";

export const DEVELOPER_ROUTES = {
	refresh: defineCallbackRoute("developer:refresh"),
} as const;

export const developerFeature = defineFeature({
	name: "developer",
	access: "developer",
	commands: [
		{
			name: "icons",
			description: "Developer icons",
			access: "developer",
			handler: async (ctx) => {
				await ctx.reply("Developer Stats…");
			},
		},
	],
	callbacks: [
		defineCallback({
			route: DEVELOPER_ROUTES.refresh,
			access: "developer",
			handler: async (ctx) => {
				await ctx.editMessageText("Developer Refreshed callback");
			},
		}),
	],
});
