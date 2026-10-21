import {
  type Bot,
  type Context,
  InlineKeyboard,
  type Middleware,
} from "grammy";

export type BroadcastTarget = "users" | "channels" | "groups" | "all";

export type CallbackAction =
  | typeof PUBLIC_CALLBACKS.HELP
  | typeof ADMIN_CALLBACKS.REFRESH_STATS
  | typeof ADMIN_CALLBACKS.BROADCAST_CANCEL
  | ReturnType<typeof ADMIN_CALLBACKS.BROADCAST_SEND.build>
  | ReturnType<typeof ADMIN_CALLBACKS.BROADCAST_RETRY.build>;

export const PUBLIC_CALLBACKS = {
  HELP: "public:help",
} as const;

export const ADMIN_CALLBACKS = {
  REFRESH_STATS: "admin:refresh_stats",
  BROADCAST_CANCEL: "admin:broadcast:cancel",
  BROADCAST_SEND: {
    regex: /^admin:broadcast:send:(users|channels|groups|all):(\d+)$/,
    build: (
      target: BroadcastTarget,
      messageId: number,
    ): `admin:broadcast:send:${BroadcastTarget}:${number}` =>
      `admin:broadcast:send:${target}:${messageId}`,
    parse: (
      data: string,
    ): { target: BroadcastTarget; messageId: number } | null => {
      const match = data.match(ADMIN_CALLBACKS.BROADCAST_SEND.regex);
      if (!match) return null;
      return {
        target: match[1] as BroadcastTarget,
        messageId: Number(match[2]),
      };
    },
  },
  BROADCAST_RETRY: {
    regex: /^admin:broadcast:retry:(\d+)$/,
    build: (broadcastId: number): `admin:broadcast:retry:${number}` =>
      `admin:broadcast:retry:${broadcastId}`,
    parse: (data: string): { broadcastId: number } | null => {
      const match = data.match(ADMIN_CALLBACKS.BROADCAST_RETRY.regex);
      if (!match) return null;
      return { broadcastId: Number(match[1]) };
    },
  },
} as const;

export function registerStaticCallback(
  bot: Bot<Context>,
  action:
    | typeof PUBLIC_CALLBACKS.HELP
    | typeof ADMIN_CALLBACKS.REFRESH_STATS
    | typeof ADMIN_CALLBACKS.BROADCAST_CANCEL,
  ...middleware: Array<Middleware<Context>>
): void {
  bot.callbackQuery(action, ...middleware);
}

export class TypedInlineKeyboard extends InlineKeyboard {
  override text(label: string, data: CallbackAction): this {
    return super.text(label, data);
  }
}
