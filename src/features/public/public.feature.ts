import { defineFeature } from "@/configs/feature.config";
import { startCallback, startCommand } from "@/features/public/start";

export const PUBLIC_CALLBACKS = {
	refresh: "public:start",
} as const;

export const publicFeature = defineFeature({
	name: "public",
	access: "public",
	commands: [
		{
			name: "start",
			description: "This is the start command",
			access: "public",
			handler: startCommand,
		},
	],
	callbacks: [
		{
			data: PUBLIC_CALLBACKS.refresh,
			access: "public",
			handler: startCallback,
		},
	],
});
