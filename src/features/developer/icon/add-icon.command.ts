import type { BotCommandContext } from "@/core";
import {
	extractCustomEmoji,
	resolveCandidateKey,
	saveIcon,
} from "@/features/developer/icon/icon.service";
import { persistIconRegistry } from "@/handlers/register-icons-registry.handler";
import { logger } from "@/lib/logger";

export async function developerAddIconCommand(
	ctx: BotCommandContext,
): Promise<void> {
	const repliedMessage = ctx.msg.reply_to_message;

	if (!repliedMessage) {
		await ctx.reply(
			"Reply to a message containing custom emoji with /add_icon <icon_name>.",
		);
		return;
	}

	const capturedIcons = extractCustomEmoji(repliedMessage);

	if (capturedIcons.length === 0) {
		await ctx.reply(
			"No custom emoji found. Reply to a message containing Telegram custom emoji and try again.",
		);
		return;
	}

	const providedKeys = ctx.match.trim().split(/\s+/).filter(Boolean);

	const results: string[] = [];
	let savedCount = 0;

	for (const [index, icon] of capturedIcons.entries()) {
		const candidateKey = resolveCandidateKey(
			providedKeys,
			index,
			capturedIcons.length,
			icon,
		);

		try {
			const result = saveIcon(candidateKey, icon.customEmojiId, icon.fallback, {
				entity: icon.entity,
				sticker: icon.sticker,
			});

			if (result.status === "saved") {
				savedCount++;
			}

			results.push(
				`${index + 1}. ${icon.fallback} — ${
					result.status === "saved" ? "Saved" : "Already exists"
				} (${result.key})`,
			);
		} catch (error) {
			results.push(
				`${index + 1}. ${icon.fallback} — Failed: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			);
		}
	}

	if (savedCount > 0) {
		try {
			await persistIconRegistry();
		} catch (error) {
			await ctx.reply(
				`Captured icons in memory, but failed to persist registry: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
			);
			return;
		}
	}

	logger.info("IconGrab", "Icon capture completed", {
		captured: capturedIcons.length,
		saved: savedCount,
	});

	await ctx.reply(`Icon capture results:\n\n${results.join("\n")}`);
}