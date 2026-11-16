import type { Composer } from "grammy";

import type { Access } from "@/configs/access.config";
import { terminal } from "@/configs/terminal.config";
import {
	type BotCommandContext,
	type CallbackDefinition,
	type CommandDefinition,
	type Feature,
	resolveAccess,
	validateFeatures,
} from "@/core";
import type { BotContext } from "@/lib/bot";
import { logger } from "@/lib/logger";
import {
	isUserAdmin,
	isUserDeveloper,
} from "@/middlewares/access-guard.middleware";

type Scopes = Record<Access, Composer<BotContext>>;

export function registerFeaturesHandlers(
	bot: Composer<BotContext>,
	features: readonly Feature[],
): void {
	validateFeatures(features);

	const scopes = createScopes(bot);

	for (const feature of features) {
		for (const command of feature.commands ?? []) {
			registerCommand(scopes, feature, command);
		}
		for (const callback of feature.callbacks ?? []) {
			registerCallback(scopes, feature, callback);
		}
	}

	registerUnauthorizedGuards(bot, features);

	for (const feature of features) {
		feature.setup?.(scopes[feature.access]);
	}
}

function createScopes(bot: Composer<BotContext>): Scopes {
	return {
		developer: bot.filter((ctx) => isUserDeveloper(ctx.from?.id)),
		admin: bot.filter((ctx) => isUserAdmin(ctx.from?.id)),
		public: bot,
	};
}

function registerCommand(
	scopes: Scopes,
	feature: Feature,
	command: CommandDefinition,
): void {
	const access = resolveAccess(feature, command);

	scopes[access].command(command.name, async (ctx) => {
		logger.debug("Command", terminal.command(`/${command.name}`), {
			feature: feature.name,
			access,
			userId: ctx.from?.id,
		});
		await command.handler(ctx);
	});
}

function registerCallback(
	scopes: Scopes,
	feature: Feature,
	callback: CallbackDefinition,
): void {
	const access = resolveAccess(feature, callback);
	const { route } = callback;

	scopes[access].callbackQuery(route.regex, async (ctx, next) => {
		const params = route.match(ctx.callbackQuery.data);
		if (!params) return next();

		logger.debug("Callback", terminal.callback(route.pattern), {
			feature: feature.name,
			access,
			userId: ctx.from.id,
			data: terminal.info(ctx.callbackQuery.data),
		});
		await callback.handler(ctx, params);
	});
}

function registerUnauthorizedGuards(
	bot: Composer<BotContext>,
	features: readonly Feature[],
): void {
	const resetStaleMenu = createStaleMenuResetter();

	const commands = findRestrictedOnlyCommands(features);
	if (commands.length > 0) {
		bot.command(commands, async (ctx) => {
			logger.warn("Unauthorized", "Blocked a restricted command", {
				userId: ctx.from?.id,
				command: ctx.msg.text?.split(/\s/, 1)[0],
			});
			await resetStaleMenu(ctx);
		});
	}

	const callbacks = findRestrictedCallbackPatterns(features);
	if (callbacks.length > 0) {
		bot.callbackQuery(callbacks, async (ctx) => {
			logger.warn("Unauthorized", "Blocked a restricted callback", {
				userId: ctx.from.id,
				callback: ctx.callbackQuery.data,
			});
			await ctx.answerCallbackQuery().catch(() => undefined);
		});
	}
}

function findRestrictedOnlyCommands(features: readonly Feature[]): string[] {
	const publicNames = new Set<string>();
	const restrictedNames = new Set<string>();

	for (const feature of features) {
		for (const command of feature.commands ?? []) {
			const names =
				resolveAccess(feature, command) === "public"
					? publicNames
					: restrictedNames;
			names.add(command.name);
		}
	}

	return [...restrictedNames].filter((name) => !publicNames.has(name));
}

function findRestrictedCallbackPatterns(
	features: readonly Feature[],
): RegExp[] {
	return features.flatMap((feature) =>
		(feature.callbacks ?? [])
			.filter((callback) => resolveAccess(feature, callback) !== "public")
			.map((callback) => callback.route.regex),
	);
}

const MAX_TRACKED_CHATS = 10_000;

function createStaleMenuResetter(): (ctx: BotCommandContext) => Promise<void> {
	const alreadyReset = new Set<number>();

	const remember = (chatId: number): void => {
		if (alreadyReset.size >= MAX_TRACKED_CHATS) {
			const oldest = alreadyReset.values().next().value;
			if (oldest !== undefined) alreadyReset.delete(oldest);
		}
		alreadyReset.add(chatId);
	};

	return async (ctx) => {
		const { chat } = ctx;
		if (chat.type !== "private" || alreadyReset.has(chat.id)) return;

		remember(chat.id);

		await ctx.api
			.deleteMyCommands({ scope: { type: "chat", chat_id: chat.id } })
			.catch((error: unknown) => {
				logger.warn("CommandMenu", "Could not reset a stale personal menu", {
					userId: ctx.from?.id,
					error,
				});
			});
	};
}
