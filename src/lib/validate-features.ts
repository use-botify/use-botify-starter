import { ACCESS_RANK, type Access } from "@/configs/access.config";
import {
	COMMAND_NAME,
	FEATURE_NAME,
	type Feature,
	MAX_MENU_COMMANDS,
	resolveAccess,
} from "@/configs/feature.config";
import { buildCommandMenu } from "@/lib/build-command-menu";
import type { RouteInfo } from "@/lib/callback-route";
import { logger } from "@/lib/logger";

const routesCollide = (a: RouteInfo, b: RouteInfo): boolean =>
	a.segments.length === b.segments.length &&
	a.segments.every((segment, index) => {
		const other = b.segments[index];
		if (!other) return false;
		if (segment.kind === "param" || other.kind === "param") return true;
		return segment.value === other.value;
	});

export function validateFeatures(features: readonly Feature[]): void {
	const problems: string[] = [];
	const featureNames = new Set<string>();
	const commandOwners = new Map<string, string>();
	const registeredRoutes: { route: RouteInfo; feature: string }[] = [];

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
			const { route } = callback;
			const access = resolveAccess(feature, callback);
			const where = `Feature "${feature.name}", callback "${route.pattern}" (${access})`;
			const [first] = route.segments;

			if (
				route.segments.length < 2 ||
				first?.kind !== "literal" ||
				first.value !== feature.name
			) {
				problems.push(
					`${where}: pattern must start with "${feature.name}:" followed by at least one more segment, so features never collide.`,
				);
			}

			for (const existing of registeredRoutes) {
				if (routesCollide(existing.route, route)) {
					problems.push(
						`${where}: collides with "${existing.route.pattern}" from feature "${existing.feature}", one callback_data could match both. Make a literal segment differ.`,
					);
				}
			}
			registeredRoutes.push({ route, feature: feature.name });
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
