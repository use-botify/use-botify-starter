import { defineFeature } from "@/configs/feature.config";

export const PUBLIC_CALLBACKS = {
	refresh: "public:refresh",
} as const;

export const publicFeature = defineFeature({
	name: "public",
	access: "public",
	commands: [
		{
			name: "start",
			description: "This is start command",
			access: "public",
			handler: async (ctx) => {
				await ctx.reply("Start Command");
			},
		},
		{
			name: "stats",
			description: "Bot statistics",
			access: "public",
			handler: async (ctx) => {
				await ctx.reply("Public Stats…");
			},
		},
	],
	callbacks: [
		{
			data: PUBLIC_CALLBACKS.refresh,
			access: "public",
			handler: async (ctx) => {
				await ctx.editMessageText("Public Refreshed callback");
			},
		},
	],
});
