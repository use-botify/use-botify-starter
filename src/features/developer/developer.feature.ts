import { defineFeature } from "@/configs/feature.config";

export const DEVELOPER_CALLBACKS = {
	refresh: "developer:refresh",
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
		{
			data: DEVELOPER_CALLBACKS.refresh,
			access: "developer",
			handler: async (ctx) => {
				await ctx.editMessageText("Developer Refreshed callback");
			},
		},
	],
});
