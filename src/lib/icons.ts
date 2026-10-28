import type { InlineKeyboardButton } from "grammy/types";

import {
	ICON_REGISTRY,
	type IconDetail,
	type IconKey,
	type IconName,
	type RegisteredIconKey,
} from "@/registry/icons.registry";
import { escapeHtml } from "@/utils/escape-html";

export type { IconDetail, IconKey, IconName, RegisteredIconKey };
export { ICON_REGISTRY };

export function findIcon(key: IconKey): IconDetail | undefined {
	return ICON_REGISTRY[key];
}

export function getIcon(key: IconKey): IconDetail {
	const icon = findIcon(key);

	if (!icon) {
		throw new Error(`Unknown icon: ${key}`);
	}

	return icon;
}

/**
 * Renders a registered custom emoji as a Telegram HTML `<tg-emoji>` tag.
 */
export function renderIcon(key: IconKey): string {
	const icon = getIcon(key);

	return (
		`<tg-emoji emoji-id="${escapeHtml(icon.customEmojiId)}">` +
		`${escapeHtml(icon.fallback)}</tg-emoji>`
	);
}

/**
 * Builds a Telegram inline callback button with a custom emoji icon.
 */

export function iconCallbackButton(
	iconKey: IconKey,
	text: string,
	callbackData = "noop",
): InlineKeyboardButton.CallbackButton {
	const icon = findIcon(iconKey);

	return {
		text,
		callback_data: callbackData,
		...(icon ? { icon_custom_emoji_id: icon.customEmojiId } : {}),
	};
}

/**
 * Alias for `iconCallbackButton` kept for existing call sites and tests.
 */
export const iconInlineButton = iconCallbackButton;

/**
 * Builds a Telegram inline URL button with a custom emoji icon.
 */
export function iconUrlButton(
	iconKey: IconKey,
	text: string,
	url: string,
): InlineKeyboardButton.UrlButton {
	const icon = findIcon(iconKey);

	return {
		text,
		url,
		...(icon ? { icon_custom_emoji_id: icon.customEmojiId } : {}),
	};
}
