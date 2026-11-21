import type { Context } from "grammy"

import type {
  DefaultAccess,
  Feature,
  FeatureValidationProblem,
  ValidateFeaturesOptions,
} from "../types/feature.types"
import type { RouteInfo } from "../types/route.types"
import { FeatureValidationError } from "./errors"
import { resolveAccess } from "./feature"
import { hasRoutePrefix, routesCollide } from "./route"

export const MAX_COMMAND_DESCRIPTION_LENGTH = 256
export const MAX_MENU_COMMANDS = 100

const FEATURE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/
const COMMAND_NAME_PATTERN = /^[a-z0-9_]{1,32}$/

function checkFeatureNames<C extends Context, TAccess extends string>(
  features: readonly Feature<C, TAccess>[],
  allowedTiers?: ReadonlySet<string>
): FeatureValidationProblem[] {
  const problems: FeatureValidationProblem[] = []
  const seen = new Set<string>()

  for (const feature of features) {
    if (!FEATURE_NAME_PATTERN.test(feature.name)) {
      problems.push({
        kind: "feature",
        feature: feature.name,
        message: `Feature "${feature.name}": name must start with a lowercase letter and use only lowercase letters, digits, or underscores.`,
      })
    }

    if (seen.has(feature.name)) {
      problems.push({
        kind: "feature",
        feature: feature.name,
        message: `Feature "${feature.name}" is registered more than once.`,
      })
    }
    seen.add(feature.name)

    if (allowedTiers && !allowedTiers.has(feature.access)) {
      problems.push({
        kind: "access",
        feature: feature.name,
        target: feature.access,
        message: `Feature "${feature.name}": unknown access tier "${feature.access}".`,
      })
    }
  }

  return problems
}

function checkCommands<C extends Context, TAccess extends string>(
  features: readonly Feature<C, TAccess>[],
  allowedTiers?: ReadonlySet<string>
): FeatureValidationProblem[] {
  const problems: FeatureValidationProblem[] = []
  const owners = new Map<string, string>()

  for (const feature of features) {
    for (const command of feature.commands ?? []) {
      const access = resolveAccess(feature, command)
      const where = `Feature "${feature.name}", command "${command.name}" (${access})`

      if (allowedTiers && !allowedTiers.has(access)) {
        problems.push({
          kind: "access",
          feature: feature.name,
          target: command.name,
          message: `${where}: unknown access tier "${access}".`,
        })
      }

      if (!COMMAND_NAME_PATTERN.test(command.name)) {
        problems.push({
          kind: "command",
          feature: feature.name,
          target: command.name,
          message: `${where}: name must be 1-32 lowercase letters, digits, or underscores with no leading slash.`,
        })
      }

      const trimmedDescription = command.description.trim()
      if (
        trimmedDescription.length < 1 ||
        trimmedDescription.length > MAX_COMMAND_DESCRIPTION_LENGTH
      ) {
        problems.push({
          kind: "command",
          feature: feature.name,
          target: command.name,
          message: `${where}: description must be 1-${MAX_COMMAND_DESCRIPTION_LENGTH} characters.`,
        })
      }

      const key = `${command.name}:${access}`
      const owner = owners.get(key)
      if (owner) {
        problems.push({
          kind: "command",
          feature: feature.name,
          target: command.name,
          message: `${where}: already defined for "${access}" access by feature "${owner}".`,
        })
      } else {
        owners.set(key, feature.name)
      }
    }
  }

  return problems
}

function checkCallbacks<C extends Context, TAccess extends string>(
  features: readonly Feature<C, TAccess>[],
  requireFeaturePrefix: boolean,
  allowedTiers?: ReadonlySet<string>
): FeatureValidationProblem[] {
  const problems: FeatureValidationProblem[] = []
  const registered: { route: RouteInfo; feature: string }[] = []

  for (const feature of features) {
    for (const callback of feature.callbacks ?? []) {
      const { route } = callback
      const access = resolveAccess(feature, callback)
      const where = `Feature "${feature.name}", callback "${route.pattern}" (${access})`

      if (allowedTiers && !allowedTiers.has(access)) {
        problems.push({
          kind: "access",
          feature: feature.name,
          target: route.pattern,
          message: `${where}: unknown access tier "${access}".`,
        })
      }

      if (requireFeaturePrefix && !hasRoutePrefix(route, feature.name)) {
        problems.push({
          kind: "callback",
          feature: feature.name,
          target: route.pattern,
          message: `${where}: pattern must start with "${feature.name}:" followed by at least one segment so features never collide.`,
        })
      }

      for (const other of registered) {
        if (routesCollide(other.route, route)) {
          problems.push({
            kind: "callback",
            feature: feature.name,
            target: route.pattern,
            message: `${where}: collides with "${other.route.pattern}" from feature "${other.feature}". Make a literal segment differ.`,
          })
        }
      }

      registered.push({ route, feature: feature.name })
    }
  }

  return problems
}

function checkMenuSizes<C extends Context, TAccess extends string>(
  features: readonly Feature<C, TAccess>[],
  tierOrder: readonly TAccess[] | undefined,
  maxMenuCommands: number
): FeatureValidationProblem[] {
  const problems: FeatureValidationProblem[] = []

  if (tierOrder && tierOrder.length > 0) {
    const cumulative = new Set<string>()

    for (const tier of tierOrder) {
      for (const feature of features) {
        for (const command of feature.commands ?? []) {
          if (
            command.showInMenu !== false &&
            resolveAccess(feature, command) === tier
          ) {
            cumulative.add(command.name)
          }
        }
      }

      if (cumulative.size > maxMenuCommands) {
        problems.push({
          kind: "menu",
          target: tier,
          message: `The "${tier}" command menu has ${cumulative.size} commands; Telegram allows at most ${maxMenuCommands}. Set showInMenu: false on some commands.`,
        })
      }
    }

    return problems
  }

  const byTier = new Map<string, Set<string>>()

  for (const feature of features) {
    for (const command of feature.commands ?? []) {
      if (command.showInMenu === false) {
        continue
      }

      const access = resolveAccess(feature, command)
      let names = byTier.get(access)
      if (!names) {
        names = new Set<string>()
        byTier.set(access, names)
      }
      names.add(command.name)
    }
  }

  for (const [tier, names] of byTier) {
    if (names.size > maxMenuCommands) {
      problems.push({
        kind: "menu",
        target: tier,
        message: `The "${tier}" command menu has ${names.size} commands; Telegram allows at most ${maxMenuCommands}. Set showInMenu: false on some commands.`,
      })
    }
  }

  return problems
}

/**
 * Inspects a list of features and returns every validation problem found
 * without throwing.
 */
export function checkFeatures<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
>(
  features: readonly Feature<C, TAccess>[],
  options: ValidateFeaturesOptions<TAccess> = {}
): readonly FeatureValidationProblem[] {
  const requireFeaturePrefix = options.requireFeaturePrefix ?? true
  const maxMenuCommands = options.maxMenuCommands ?? MAX_MENU_COMMANDS
  const allowedTiers = options.tierOrder
    ? new Set<string>(options.tierOrder)
    : undefined

  return Object.freeze([
    ...checkFeatureNames(features, allowedTiers),
    ...checkCommands(features, allowedTiers),
    ...checkCallbacks(features, requireFeaturePrefix, allowedTiers),
    ...checkMenuSizes(features, options.tierOrder, maxMenuCommands),
  ])
}

/**
 * Validates a list of features up front and throws `FeatureValidationError`
 * if any problems are detected.
 */
export function validateFeatures<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
>(
  features: readonly Feature<C, TAccess>[],
  options: ValidateFeaturesOptions<TAccess> = {}
): void {
  const problems = checkFeatures(features, options)

  if (problems.length > 0) {
    throw new FeatureValidationError(problems)
  }
}
