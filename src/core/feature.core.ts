import type { CallbackQueryContext, CommandContext, Composer } from "grammy";

import type { Access } from "@/configs/access.config";
import type {
  CallbackParams,
  CallbackRoute,
  RouteInfo,
} from "@/core/route.core";
import type { BotContext } from "@/lib/bot";

export type BotCommandContext = CommandContext<BotContext>;
export type BotCallbackContext = CallbackQueryContext<BotContext>;

type HandlerResult = unknown;

export type CommandDefinition = {
  name: string;
  description: string;
  useCase?: string;
  access?: Access;
  showInMenu?: boolean;
  handler: (ctx: BotCommandContext) => HandlerResult;
};

export type CallbackDefinition = {
  route: RouteInfo;
  access?: Access;
  handler: (
    ctx: BotCallbackContext,
    params: Record<string, string>,
  ) => HandlerResult;
};

export type Feature = {
  name: string;
  access: Access;
  commands?: readonly CommandDefinition[];
  callbacks?: readonly CallbackDefinition[];
  setup?: (composer: Composer<BotContext>) => void;
};

export const defineFeature = <T extends Feature>(feature: T): T => feature;

export const defineCommand = (command: CommandDefinition): CommandDefinition =>
  command;

export const defineCallback = <P extends string>(definition: {
  route: CallbackRoute<P>;
  access?: Access;
  handler: (
    ctx: BotCallbackContext,
    params: CallbackParams<P>,
  ) => HandlerResult;
}): CallbackDefinition => ({
  route: definition.route,
  access: definition.access,
  handler: (ctx, params) =>
    definition.handler(ctx, params as unknown as CallbackParams<P>),
});

export const resolveAccess = (
  feature: Feature,
  item: { access?: Access },
): Access => item.access ?? feature.access;
