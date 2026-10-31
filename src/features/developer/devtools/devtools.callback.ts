import type { BotCallbackContext } from "@/core";
import { getDeveloperGuide } from "@/features/developer/developer.guide";
import { DEVELOPER_ROUTES } from "@/features/developer/developer.route";
import {
	buildDevtoolsPanel,
	DEVTOOLS_DESCRIPTION,
} from "@/features/developer/devtools/devtools.command";
import { buildGuidePanel, buildPanelGreeting } from "@/features/shared";

export const developerDevtoolsCallbacks = async (ctx: BotCallbackContext) => {
	await ctx.answerCallbackQuery();

	const { caption, keyboard } = buildDevtoolsPanel(ctx.from);

	await ctx.editMessageText(
		`${buildPanelGreeting("developer", ctx.from, DEVTOOLS_DESCRIPTION)}\n\n${caption}`,

		{
			parse_mode: "HTML",
			reply_markup: keyboard,
		},
	);
};

export const developerGuideCallback = async (
	ctx: BotCallbackContext,
	command_name: string,
) => {
	const guide = getDeveloperGuide(command_name);
	if (!guide) {
		await ctx.answerCallbackQuery({
			text: "Unknown command.",
			show_alert: true,
		});
		return;
	}

	const panel = buildGuidePanel(guide, {
		back: DEVELOPER_ROUTES.devtools.build(),
		execute: guide.execute
			? DEVELOPER_ROUTES.execute.build({ command_name })
			: undefined,
	});

	await ctx.editMessageText(
		`${buildPanelGreeting("developer", ctx.from, DEVTOOLS_DESCRIPTION)}\n\n${panel.text}`,
		{ parse_mode: "HTML", reply_markup: panel.keyboard },
	);
};

export const developerExecuteCallback = async (
	ctx: BotCallbackContext,
	command_name: string,
) => {
	const execute = getDeveloperGuide(command_name)?.execute;
	if (!execute) {
		await ctx.answerCallbackQuery({
			text: "This command can't be run from here.",
			show_alert: true,
		});
		return;
	}

	await ctx.answerCallbackQuery();
	await execute(ctx);
};
