import { defineCommand, defineFeature } from "@/core";
/**
 * @import commands and callbacks under this
 */
import { developerDevtoolsCommand } from "@/features/developer/devtools";

export const developerFeature = defineFeature({
	name: "developer",
	access: "developer",
	commands: [
		defineCommand({
			name: "devtools",
			description: "Developer tools",
			access: "developer",
			handler: developerDevtoolsCommand,
		}),
	],
});
