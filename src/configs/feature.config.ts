import type { CallbackQueryContext, CommandContext, Composer } from "grammy";

import type { Access } from "@/configs/access.config";
import type { BotContext } from "@/lib/bot";
import type {
	CallbackParams,
	CallbackRoute,
	RouteInfo,
} from "@/lib/callback-route";

export const FEATURE_NAME = /^[a-z][a-z0-9_]*$/;
export const COMMAND_NAME = /^[a-z0-9_]{1,32}$/;
export const MAX_MENU_COMMANDS = 100;

export type CallbackQueryContextWithBotContext =
	CallbackQueryContext<BotContext>;
export type CommandContextWithBotContext = CommandContext<BotContext>;

export type CommandDefinition = {
	name: string;
	description: string;
	access?: Access;
	showInMenu?: boolean;
	handler: (ctx: CommandContextWithBotContext) => Promise<void> | void;
};

export type CallbackDefinition = {
	route: RouteInfo;
	access?: Access;
	handler: (
		ctx: CallbackQueryContextWithBotContext,
		params: Record<string, string>,
	) => Promise<void> | void;
};

export type Feature = {
	name: string;
	access: Access;
	commands?: readonly CommandDefinition[];
	callbacks?: readonly CallbackDefinition[];
	setup?: (composer: Composer<BotContext>) => void;
};

export const defineFeature = <T extends Feature>(feature: T): T => feature;

export const defineCallback = <P extends string>(definition: {
	route: CallbackRoute<P>;
	access?: Access;
	handler: (
		ctx: CallbackQueryContextWithBotContext,
		params: CallbackParams<P>,
	) => Promise<void> | void;
}): CallbackDefinition => ({
	route: definition.route,
	access: definition.access,
	handler: (ctx, params) =>
		definition.handler(ctx, params as unknown as CallbackParams<P>),
});

export const resolveAccess = (
	feature: Feature,
	item: {
		access?: Access;
	},
): Access => item.access ?? feature.access;
