import { defineFeature } from "@/configs/feature.config";

export const ADMIN_CALLBACKS = {
	refresh: "admin:refresh",
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
		{
			data: ADMIN_CALLBACKS.refresh,
			access: "admin",
			handler: async (ctx) => {
				await ctx.editMessageText("Admin Refreshed callback");
			},
		},
	],
});
