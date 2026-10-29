import { defineCommand, defineFeature } from "@/core";
/**
 * @import commands and callbacks under this
 */
import { publicStartCommand } from "@/features/public/start";

export const publicFeature = defineFeature({
	name: "public",
	access: "public",
	commands: [
		defineCommand({
			name: "start",
			description: "Open the main menu",
			handler: publicStartCommand,
		}),
	],
});
