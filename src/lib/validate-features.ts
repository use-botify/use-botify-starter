import {
	COMMAND_NAME,
	FEATURE_NAME,
	type Feature,
	MAX_CALLBACK_BYTES,
	MAX_MENU_COMMANDS,
	resolveAccess,
} from "@/configs/feature.config";
import { buildCommandMenu } from "@/lib/build-command-menu";
import { logger } from "@/lib/logger";
import { ACCESS_RANK, type Access } from "@/middlewares/access-guard";

export function validateFeatures(features: readonly Feature[]): void {
	const problems: string[] = [];
	const featureNames = new Set<string>();
	const commandOwners = new Map<string, string>();
	const callbackOwners = new Map<string, string>();

	for (const feature of features) {
		if (!FEATURE_NAME.test(feature.name)) {
			problems.push(
				`Feature "${feature.name}": name must start with a lowercase letter and use only lowercase letters, digits or underscores.`,
			);
		}
		if (featureNames.has(feature.name)) {
			problems.push(`Feature "${feature.name}" is listed more than once.`);
		}
		featureNames.add(feature.name);

		for (const command of feature.commands ?? []) {
			const access = resolveAccess(feature, command);
			const where = `Feature "${feature.name}", command "${command.name}" (${access})`;

			if (!COMMAND_NAME.test(command.name)) {
				problems.push(
					`${where}: name must be 1-32 lowercase letters, digits or underscores, with no leading slash.`,
				);
			}
			if (command.description.length < 1 || command.description.length > 256) {
				problems.push(`${where}: description must be 1-256 characters.`);
			}

			const commandKey = `${command.name}:${access}`;
			const owner = commandOwners.get(commandKey);
			if (owner) {
				problems.push(
					`${where}: already defined for "${access}" access by feature "${owner}".`,
				);
			} else {
				commandOwners.set(commandKey, feature.name);
			}
		}

		for (const callback of feature.callbacks ?? []) {
			const where = `Feature "${feature.name}", callback "${callback.data}"`;
			const bytes = Buffer.byteLength(callback.data);

			if (!callback.data.startsWith(`${feature.name}:`)) {
				problems.push(
					`${where}: data must start with "${feature.name}:" so features never collide.`,
				);
			}
			if (bytes > MAX_CALLBACK_BYTES) {
				problems.push(
					`${where}: callback_data is ${bytes} bytes, Telegram allows at most ${MAX_CALLBACK_BYTES}.`,
				);
			}

			const owner = callbackOwners.get(callback.data);
			if (owner) {
				problems.push(`${where}: already defined by feature "${owner}".`);
			} else {
				callbackOwners.set(callback.data, feature.name);
			}
		}
	}

	for (const tier of Object.keys(ACCESS_RANK) as Access[]) {
		const size = buildCommandMenu(features, tier).length;
		if (size > MAX_MENU_COMMANDS) {
			problems.push(
				`The ${tier} menu has ${size} commands, Telegram allows at most ${MAX_MENU_COMMANDS}. Set showInMenu: false on some.`,
			);
		}
	}

	if (problems.length > 0) {
		for (const problem of problems) logger.error("FeatureConfig", problem);
		throw new Error(
			`Invalid feature configuration: ${problems.length} problem(s). See the FeatureConfig errors above.`,
		);
	}
}
