import { defineCallback, defineCommand, defineFeature } from "@/core";
import { DEVELOPER_ROUTES } from "@/features/developer/developer.route";
/**
 * @import commands and callbacks under this
 */
import {
	developerDevtoolsCallback,
	developerDevtoolsCommand,
} from "@/features/developer/devtools";

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
	callbacks: [
		defineCallback({
			access: "developer",
			route: DEVELOPER_ROUTES.devtools,
			handler: developerDevtoolsCallback,
		}),
	],
});
