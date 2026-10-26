import type { InlineKeyboardButton } from "grammy/types";

export interface IconDetail {
	key: string;
	customEmojiId: string;
	fallback: string;
	entity: { offset: number; length: number } | null;
	sticker: {
		fileId: string;
		fileUniqueId: string;
		emoji: string | null;
		setName: string | null;
		stickerType: string;
		width: number;
		height: number;
		isAnimated: boolean;
		isVideo: boolean;
		format: "static" | "animated" | "video";
	} | null;
	receivedMessage: {
		messageId: number;
		chatId: string;
		isForwarded: boolean;
		forwardOriginType: string | null;
	};
	capturedAt: string;
}

export const ICON_REGISTRY = {
	alert: {
		key: "alert",
		customEmojiId: "5395695537687123235",
		fallback: "🚨",
		entity: {
			offset: 0,
			length: 2,
		},
		sticker: {
			fileId:
				"CAACAgIAAxUAAWrcp59HPJd-AAF2dUNAWJMslXwnYwACI1UAAoFc4UpXdWvtiDH1uD0E",
			fileUniqueId: "AgADI1UAAoFc4Uo",
			emoji: "🚨",
			setName: "NewsEmoji",
			stickerType: "custom_emoji",
			width: 512,
			height: 512,
			isAnimated: true,
			isVideo: false,
			format: "animated",
		},
		receivedMessage: {
			messageId: 397,
			chatId: "1577253609",
			isForwarded: true,
			forwardOriginType: "hidden_user",
		},
		capturedAt: "2026-10-24T13:52:53.874Z",
	},
	chats: {
		key: "chats",
		customEmojiId: "5443038326535759644",
		fallback: "💬",
		entity: {
			offset: 0,
			length: 2,
		},
		sticker: {
			fileId:
				"CAACAgIAAxUAAWrcpT1_jnaH_cPt1P8GdeplQgnhAAIcJwAChY6JS2saUuUIm3YLPQQ",
			fileUniqueId: "AgADHCcAAoWOiUs",
			emoji: "💬",
			setName: "NewsEmoji",
			stickerType: "custom_emoji",
			width: 512,
			height: 512,
			isAnimated: true,
			isVideo: false,
			format: "animated",
		},
		receivedMessage: {
			messageId: 380,
			chatId: "1577253609",
			isForwarded: true,
			forwardOriginType: "hidden_user",
		},
		capturedAt: "2026-10-24T13:47:10.470Z",
	},
	close: {
		key: "close",
		customEmojiId: "5210952531676504517",
		fallback: "❌",
		entity: {
			offset: 0,
			length: 1,
		},
		sticker: {
			fileId:
				"CAACAgIAAxUAAWrcpVk-RQRZb61aARbvD3FzOSWIAALFIQACuAVRSMlAC3k1IeJVPQQ",
			fileUniqueId: "AgADxSEAArgFUUg",
			emoji: "❌",
			setName: "NewsEmoji",
			stickerType: "custom_emoji",
			width: 512,
			height: 512,
			isAnimated: true,
			isVideo: false,
			format: "animated",
		},
		receivedMessage: {
			messageId: 393,
			chatId: "1577253609",
			isForwarded: true,
			forwardOriginType: "hidden_user",
		},
		capturedAt: "2026-10-24T13:51:42.642Z",
	},
	flash: {
		key: "flash",
		customEmojiId: "5224607267797606837",
		fallback: "☄️",
		entity: {
			offset: 0,
			length: 2,
		},
		sticker: {
			fileId:
				"CAACAgIAAxUAAWrcpyuZbRGjmz88_6MUdZqRjMNLAAK1IQACoYiBSKedex8uzPWGPQQ",
			fileUniqueId: "AgADtSEAAqGIgUg",
			emoji: "☄️",
			setName: "NewsEmoji",
			stickerType: "custom_emoji",
			width: 512,
			height: 512,
			isAnimated: true,
			isVideo: false,
			format: "animated",
		},
		receivedMessage: {
			messageId: 396,
			chatId: "1577253609",
			isForwarded: true,
			forwardOriginType: "hidden_user",
		},
		capturedAt: "2026-10-24T13:53:37.431Z",
	},
	gear: {
		key: "gear",
		customEmojiId: "5341715473882955310",
		fallback: "⚙️",
		entity: {
			offset: 0,
			length: 2,
		},
		sticker: {
			fileId:
				"CAACAgIAAxUAAWrco6LyvxrPaQWaLVmWfp14Zk1cAAIuPgAC7JUhSsWp13kPXhC9PQQ",
			fileUniqueId: "AgADLj4AAuyVIUo",
			emoji: "⚙️",
			setName: "NewsEmoji",
			stickerType: "custom_emoji",
			width: 512,
			height: 512,
			isAnimated: true,
			isVideo: false,
			format: "animated",
		},
		receivedMessage: {
			messageId: 394,
			chatId: "1577253609",
			isForwarded: true,
			forwardOriginType: "hidden_user",
		},
		capturedAt: "2026-10-24T13:55:18.064Z",
	},
	happy: {
		key: "happy",
		customEmojiId: "5461117441612462242",
		fallback: "🙂",
		entity: {
			offset: 0,
			length: 2,
		},
		sticker: {
			fileId:
				"CAACAgIAAxUAAWrcp8O8pf4jZYwWph_HhUJg0EhJAAKiOAACYcnJS499jqI9chT3PQQ",
			fileUniqueId: "AgADojgAAmHJyUs",
			emoji: "🙂",
			setName: "NewsEmoji",
			stickerType: "custom_emoji",
			width: 512,
			height: 512,
			isAnimated: true,
			isVideo: false,
			format: "animated",
		},
		receivedMessage: {
			messageId: 399,
			chatId: "1577253609",
			isForwarded: true,
			forwardOriginType: "hidden_user",
		},
		capturedAt: "2026-10-24T13:51:59.862Z",
	},
	shield: {
		key: "shield",
		customEmojiId: "5251203410396458957",
		fallback: "🛡",
		entity: {
			offset: 0,
			length: 2,
		},
		sticker: {
			fileId:
				"CAACAgIAAxUAAWrcp6zvPYgQGb_4IeVMVFfbxx_6AALNLwACrgXgSCS2egrQbhNMPQQ",
			fileUniqueId: "AgADzS8AAq4F4Eg",
			emoji: "🛡",
			setName: "NewsEmoji",
			stickerType: "custom_emoji",
			width: 512,
			height: 512,
			isAnimated: true,
			isVideo: false,
			format: "animated",
		},
		receivedMessage: {
			messageId: 398,
			chatId: "1577253609",
			isForwarded: true,
			forwardOriginType: "hidden_user",
		},
		capturedAt: "2026-10-24T13:52:17.894Z",
	},
} as const satisfies Record<string, IconDetail>;

export type IconName = keyof typeof ICON_REGISTRY;

/**
 * Renders a saved Telegram custom emoji as an HTML <tg-emoji> tag.
 */
export function renderIcon(name: IconName): string {
	const icon = ICON_REGISTRY[name];
	return `<tg-emoji emoji-id="${icon.customEmojiId}">${icon.fallback}</tg-emoji>`;
}

export function iconInlineButton(
	iconName: IconName,
	text: string,
	data = "noop",
): InlineKeyboardButton.CallbackButton {
	return {
		text,
		callback_data: data,
		icon_custom_emoji_id: ICON_REGISTRY[iconName].customEmojiId,
	};
}
