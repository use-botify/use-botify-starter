import type { Context } from "grammy"

import type {
  CallbackConfig,
  CallbackDefinition,
  CommandDefinition,
  DefaultAccess,
  Feature,
  FeatureHelpers,
} from "../types/feature.types"
import type { CallbackParams } from "../types/route.types"
import { defineCallbackRoute } from "./route"

/**
 * Resolves the effective access tier for a command or callback, falling back
 * to its parent feature's access tier.
 */
export function resolveAccess<TAccess extends string>(
  feature: Pick<Feature<Context, TAccess>, "access">,
  item: { readonly access?: TAccess }
): TAccess {
  return item.access ?? feature.access
}

/**
 * Creates context- and access-bound `defineCommand`, `defineCallback`, and
 * `defineFeature` helpers so custom bot contexts flow without repeating generics.
 */
export function createFeatureHelpers<
  C extends Context = Context,
  TAccess extends string = DefaultAccess,
>(): FeatureHelpers<C, TAccess> {
  const defineCommand = (
    definition: CommandDefinition<C, TAccess>
  ): CommandDefinition<C, TAccess> => Object.freeze({ ...definition })

  const defineCallback = <const P extends string>(
    config: CallbackConfig<C, P, TAccess>
  ): CallbackDefinition<C, TAccess> => {
    const route =
      typeof config.route === "string"
        ? defineCallbackRoute(config.route)
        : config.route

    return Object.freeze<CallbackDefinition<C, TAccess>>({
      route,
      ...(config.access !== undefined ? { access: config.access } : {}),
      handler: (ctx, params) =>
        config.handler(ctx, params as unknown as CallbackParams<P>),
    })
  }

  const defineFeature = (feature: Feature<C, TAccess>): Feature<C, TAccess> =>
    Object.freeze<Feature<C, TAccess>>({
      ...feature,
      ...(feature.commands
        ? { commands: Object.freeze([...feature.commands]) }
        : {}),
      ...(feature.callbacks
        ? { callbacks: Object.freeze([...feature.callbacks]) }
        : {}),
    })

  return Object.freeze<FeatureHelpers<C, TAccess>>({
    defineCommand,
    defineCallback,
    defineFeature,
  })
}

const defaultHelpers = createFeatureHelpers()

export const { defineCommand, defineCallback, defineFeature } = defaultHelpers
