import chalk from "chalk";
import type { Composer } from "grammy";

import { type Feature, resolveAccess } from "@/configs/feature.config";
import type { BotContext } from "@/lib/bot";
import { logger } from "@/lib/logger";
import { validateFeatures } from "@/lib/validate-features";
import {
	type Access,
	isUserAdmin,
	isUserDeveloper,
} from "@/middlewares/access-guard";

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
	const restrictedCallbacks: string[] = [];

	for (const feature of features) {
		for (const command of feature.commands ?? []) {
			const access = resolveAccess(feature, command);

			scopes[access].command(command.name, async (ctx) => {
				logger.info(
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

			scopes[access].callbackQuery(callback.data, async (ctx) => {
				logger.info("Callback", callback.data, {
					feature: feature.name,
					access,
					userId: ctx.from?.id,
				});

				await callback.handler(ctx);
			});

			if (access !== "public") restrictedCallbacks.push(callback.data);
		}
	}

	const strictlyRestrictedCommands = [...restrictedCommands].filter(
		(name) => !publicCommands.has(name),
	);

	if (strictlyRestrictedCommands.length > 0) {
		bot.command(strictlyRestrictedCommands, (ctx) => {
			logger.warn("Unauthorized", "Blocked a restricted command", {
				userId: ctx.from?.id,
				command: ctx.message?.text,
			});
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
