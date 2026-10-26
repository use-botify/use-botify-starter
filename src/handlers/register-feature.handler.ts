import chalk from "chalk";
import type { CommandContext, Composer } from "grammy";

import type { Access } from "@/configs/access.config";
import { type Feature, resolveAccess } from "@/configs/feature.config";
import type { BotContext } from "@/lib/bot";
import { logger } from "@/lib/logger";
import { validateFeatures } from "@/lib/validate-features";
import { isUserAdmin, isUserDeveloper } from "@/middlewares/access-guard";

const MAX_TRACKED_MENU_RESETS = 10_000;
const resetMenus = new Set<number>();

const resetStaleMenu = async (
	ctx: CommandContext<BotContext>,
): Promise<void> => {
	const chat = ctx.chat;
	if (chat.type !== "private" || resetMenus.has(chat.id)) return;

	if (resetMenus.size >= MAX_TRACKED_MENU_RESETS) resetMenus.clear();
	resetMenus.add(chat.id);

	await ctx.api
		.deleteMyCommands({ scope: { type: "chat", chat_id: chat.id } })
		.catch((error: unknown) => {
			logger.warn("CommandMenu", "Could not reset a stale personal menu", {
				userId: ctx.from?.id,
				error,
			});
		});
};

export function registerFeatureHandler(
	bot: Composer<BotContext>,
	features: readonly Feature[],
): void {
	validateFeatures(features);

	const scopes: Record<Access, Composer<BotContext>> = {
		developer: bot.filter((ctx) => isUserDeveloper(ctx.from?.id)),
		admin: bot.filter((ctx) => isUserAdmin(ctx.from?.id)),
		public: bot,
	};

	const publicCommands = new Set<string>();
	const restrictedCommands = new Set<string>();
	const restrictedCallbacks: RegExp[] = [];

	for (const feature of features) {
		for (const command of feature.commands ?? []) {
			const access = resolveAccess(feature, command);

			scopes[access].command(command.name, async (ctx) => {
				logger.debug(
					"Command",
					chalk.bgGreenBright.black.bold(`/${command.name}`),
					{
						feature: feature.name,
						access,
						userId: ctx.from?.id,
					},
				);

				await command.handler(ctx);
			});

			if (access === "public") {
				publicCommands.add(command.name);
			} else {
				restrictedCommands.add(command.name);
			}
		}

		for (const callback of feature.callbacks ?? []) {
			const access = resolveAccess(feature, callback);
			const { route } = callback;

			scopes[access].callbackQuery(route.regex, async (ctx) => {
				const params = route.match(ctx.callbackQuery.data);
				if (!params) return;

				logger.debug("Callback", route.pattern, {
					feature: feature.name,
					access,
					userId: ctx.from?.id,
					data: ctx.callbackQuery.data,
				});

				await callback.handler(ctx, params);
			});

			if (access !== "public") restrictedCallbacks.push(route.regex);
		}
	}

	for (const feature of features) {
		feature.setup?.(scopes[feature.access]);
	}

	const strictlyRestrictedCommands = [...restrictedCommands].filter(
		(name) => !publicCommands.has(name),
	);

	if (strictlyRestrictedCommands.length > 0) {
		bot.command(strictlyRestrictedCommands, async (ctx) => {
			logger.warn("Unauthorized", "Blocked a restricted command", {
				userId: ctx.from?.id,
				command: chalk.bgGreenBright.black.bold(
					ctx.msg.text?.split(/\s/, 1)[0],
				),
			});
			await resetStaleMenu(ctx);
		});
	}

	if (restrictedCallbacks.length > 0) {
		bot.callbackQuery(restrictedCallbacks, async (ctx) => {
			logger.warn("Unauthorized", "Blocked a restricted callback", {
				userId: ctx.from?.id,
				callback: ctx.callbackQuery.data,
			});
			await ctx.answerCallbackQuery().catch(() => undefined);
		});
	}
}
