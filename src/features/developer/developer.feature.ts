import { defineCallback, defineCommand, defineFeature } from "@/core";
import { DEVELOPER_ROUTES } from "@/features/developer/developer.route";
import {
	developerDevtoolsCallbacks,
	developerDevtoolsCommand,
} from "@/features/developer/devtools";
/**
 * @import commands and callbacks under this
 */
import {
	developerAddIconCommand,
	developerListIconCommand,
	developerRemoveIconCommand,
} from "@/features/developer/icon";
import { sharedCloseCallback } from "@/features/shared";

import {
	developerExecuteCallback,
	developerGuideCallback,
} from "./devtools/devtools.callback";

export const developerFeature = defineFeature({
	name: "developer",
	access: "developer",
	commands: [
		defineCommand({
			name: "devtools",
			access: "developer",
			description: "Developer tools",
			handler: developerDevtoolsCommand,
		}),
		defineCommand({
			name: "list_icons",
			access: "developer",
			description: "List icons saved in the library",
			handler: developerListIconCommand,
		}),
		defineCommand({
			name: "add_icon",
			access: "developer",
			description: "Grab an icon into the library",
			handler: developerAddIconCommand,
		}),
		defineCommand({
			name: "remove_icon",
			access: "developer",
			description: "Remove an icon from the library",
			handler: developerRemoveIconCommand,
		}),
	],
	callbacks: [
		defineCallback({
			route: DEVELOPER_ROUTES.devtools,
			access: "developer",
			handler: developerDevtoolsCallbacks,
		}),
		defineCallback({
			route: DEVELOPER_ROUTES.guide,
			handler: async (ctx, { command_name }) => {
				developerGuideCallback(ctx, command_name);
			},
		}),
		defineCallback({
			route: DEVELOPER_ROUTES.execute,
			handler: async (ctx, { command_name }) => {
				developerExecuteCallback(ctx, command_name);
			},
		}),
		defineCallback({
			route: DEVELOPER_ROUTES.close,
			access: "developer",
			handler: sharedCloseCallback,
		}),
	],
});
