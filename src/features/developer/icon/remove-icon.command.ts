import type { BotCommandContext } from "@/core";
import { normalizeIconKey } from "@/features/developer/icon/icon.service";
import { persistIconRegistry } from "@/handlers/register-icons-registry.handler";
import { ICON_REGISTRY } from "@/lib/icons";

export async function developerRemoveIconCommand(
	ctx: BotCommandContext,
): Promise<void> {
	const rawKey = ctx.match.trim();
	const key = normalizeIconKey(rawKey) || rawKey;

	if (!key) {
		await ctx.reply(
			"Usage: /remove_icon <icon_name>\n\nUse /list_icons to see registered icon keys.",
		);
		return;
	}

	const existing = ICON_REGISTRY[key];
	if (!existing) {
		await ctx.reply(
			`Icon "${key}" was not found. Use /list_icons to see registered icons.`,
		);
		return;
	}

	delete ICON_REGISTRY[key];

	try {
		await persistIconRegistry();
	} catch (error) {
		ICON_REGISTRY[key] = existing;
		await ctx.reply(
			`Could not persist the registry: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
		return;
	}

	await ctx.reply(`Icon "${key}" was removed.`);
}