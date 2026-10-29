import { ACCESS_LEVELS } from "@/configs/access.config";
import type { RouteInfo } from "@/core/route.core";
import { type Feature, resolveAccess } from "@/core/feature.core";
import { logger } from "@/lib/logger";

import { buildCommandMenu } from "@/handlers/register-command-menu.handler";

const FEATURE_NAME = /^[a-z][a-z0-9_]*$/;

const COMMAND_NAME = /^[a-z0-9_]{1,32}$/;
const MAX_DESCRIPTION_LENGTH = 256;
const MAX_MENU_COMMANDS = 100;

export function validateFeatures(features: readonly Feature[]): void {
  const problems = [
    ...checkFeatureNames(features),
    ...checkCommands(features),
    ...checkCallbacks(features),
    ...checkMenuSizes(features),
  ];

  if (problems.length === 0) return;

  for (const problem of problems) logger.error("FeatureConfig", problem);
  throw new Error(
    `Invalid feature configuration: ${problems.length} problem(s). See the FeatureConfig errors above.`,
  );
}

function checkFeatureNames(features: readonly Feature[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const { name } of features) {
    if (!FEATURE_NAME.test(name)) {
      problems.push(
        `Feature "${name}": name must start with a lowercase letter and use only lowercase letters, digits or underscores.`,
      );
    }
    if (seen.has(name)) {
      problems.push(`Feature "${name}" is listed more than once.`);
    }
    seen.add(name);
  }

  return problems;
}

function checkCommands(features: readonly Feature[]): string[] {
  const problems: string[] = [];
  const owners = new Map<string, string>();

  for (const feature of features) {
    for (const command of feature.commands ?? []) {
      const access = resolveAccess(feature, command);
      const where = `Feature "${feature.name}", command "${command.name}" (${access})`;

      if (!COMMAND_NAME.test(command.name)) {
        problems.push(
          `${where}: name must be 1-32 lowercase letters, digits or underscores, with no leading slash.`,
        );
      }
      if (
        command.description.length < 1 ||
        command.description.length > MAX_DESCRIPTION_LENGTH
      ) {
        problems.push(
          `${where}: description must be 1-${MAX_DESCRIPTION_LENGTH} characters.`,
        );
      }

      const key = `${command.name}:${access}`;
      const owner = owners.get(key);
      if (owner) {
        problems.push(
          `${where}: already defined for "${access}" access by feature "${owner}".`,
        );
      } else {
        owners.set(key, feature.name);
      }
    }
  }

  return problems;
}

function checkCallbacks(features: readonly Feature[]): string[] {
  const problems: string[] = [];
  const registered: { route: RouteInfo; feature: string }[] = [];

  for (const feature of features) {
    for (const callback of feature.callbacks ?? []) {
      const { route } = callback;
      const where = `Feature "${feature.name}", callback "${route.pattern}" (${resolveAccess(feature, callback)})`;

      if (!startsWithFeatureName(route, feature.name)) {
        problems.push(
          `${where}: pattern must start with "${feature.name}:" followed by at least one more segment, so features never collide.`,
        );
      }

      for (const other of registered) {
        if (routesCollide(other.route, route)) {
          problems.push(
            `${where}: collides with "${other.route.pattern}" from feature "${other.feature}", one callback_data could match both. Make a literal segment differ.`,
          );
        }
      }
      registered.push({ route, feature: feature.name });
    }
  }

  return problems;
}

function checkMenuSizes(features: readonly Feature[]): string[] {
  return ACCESS_LEVELS.flatMap((tier) => {
    const size = buildCommandMenu(features, tier).length;
    return size > MAX_MENU_COMMANDS
      ? [
          `The ${tier} menu has ${size} commands, Telegram allows at most ${MAX_MENU_COMMANDS}. Set showInMenu: false on some.`,
        ]
      : [];
  });
}

const startsWithFeatureName = (
  route: RouteInfo,
  featureName: string,
): boolean => {
  const [first] = route.segments;
  return (
    route.segments.length >= 2 &&
    first?.kind === "literal" &&
    first.value === featureName
  );
};

const routesCollide = (a: RouteInfo, b: RouteInfo): boolean =>
  a.segments.length === b.segments.length &&
  a.segments.every((segment, index) => {
    const other = b.segments[index];
    if (!other) return false;
    if (segment.kind === "param" || other.kind === "param") return true;
    return segment.value === other.value;
  });
