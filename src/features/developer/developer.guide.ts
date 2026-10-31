import type { GuidePanel, GuidePanelItem } from "@/features/shared";

import { DEVELOPER_ROUTES } from "./developer.route";
import { developerListIconCallback } from "./icon/list-icon.command";

const DEVELOPER_GUIDES = {
	list_icons: {
		route: "/list_icons",
		use_case: "Use when you have to list your icons from your icons library",
		steps: ['List the full list of your icons with "/list_icons"'],
		execute: developerListIconCallback,
	},
	add_icon: {
		route: "/add_icon",
		use_case: "Use when you have to add a new icon in your icons library",
		steps: [
			'Reply to your icon with "/grab_icon <name of icon>"',
			"Icon saved in your library.",
		],
	},
	remove_icon: {
		route: "/remove_icon",
		use_case: "Use when you have to remove an icon in your icons library",
		steps: [
			'Send "/remove_icon <name of icon>"',
			"Icon removed from your library.",
		],
	},
} satisfies GuidePanel;

export type DeveloperGuideKey = keyof typeof DEVELOPER_GUIDES;

function isDeveloperGuideKey(key: string): key is DeveloperGuideKey {
	return Object.hasOwn(DEVELOPER_GUIDES, key);
}

export function getDeveloperGuide(
	command_name: string,
): GuidePanelItem | undefined {
	return isDeveloperGuideKey(command_name)
		? DEVELOPER_GUIDES[command_name]
		: undefined;
}

export const guideRoute = (command_name: string) =>
	DEVELOPER_ROUTES.guide.build({ command_name });
