import { defineCallback, defineFeature } from "@/configs/feature.config";
import { startCallback, startCommand } from "@/features/public/start";
import { defineCallbackRoute } from "@/lib/callback-route";

export const PUBLIC_ROUTES = {
	refresh: defineCallbackRoute("public:refresh"),
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
		defineCallback({
			route: PUBLIC_ROUTES.refresh,
			access: "public",
			handler: startCallback,
		}),
	],
});
