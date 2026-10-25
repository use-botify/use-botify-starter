import type { CallbackQueryContext, CommandContext } from "grammy";

import type { BotContext } from "@/lib/bot";
import type { Access } from "@/middlewares/access-guard";

export const FEATURE_NAME = /^[a-z][a-z0-9_]*$/;
export const COMMAND_NAME = /^[a-z0-9_]{1,32}$/;
export const MAX_CALLBACK_BYTES = 64;
export const MAX_MENU_COMMANDS = 100;

export type CommandDefinition = {
	name: string;
	description: string;
	access: Access;
	showInMenu?: boolean;
	handler: (ctx: CommandContext<BotContext>) => Promise<void> | void;
};

export type CallbackDefinition = {
	data: string;
	access: Access;
	handler: (ctx: CallbackQueryContext<BotContext>) => Promise<void> | void;
};

export type Feature = {
	name: string;
	access: Access;
	commands?: readonly CommandDefinition[];
	callbacks?: readonly CallbackDefinition[];
};

export const defineFeature = <T extends Feature>(feature: T): T => feature;

export const resolveAccess = (
	feature: Feature,
	item: { access?: Access },
): Access => item.access ?? feature.access;
