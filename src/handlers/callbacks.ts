import type { Bot, Context } from "grammy";
import {
  broadcastCancelCallback,
  broadcastRetryCallback,
  broadcastSendCallback,
  refreshStatsCallback,
} from "@/callbacks/admin";
import { helpCallback } from "@/callbacks/public";
import {
  PUBLIC_CALLBACKS,
  ADMIN_CALLBACKS,
  registerStaticCallback,
} from "@/lib/callbacks";
import { isAdmin } from "@/middlewares/is-admin";

export function registerPublicCallbacks(bot: Bot<Context>): void {
  registerStaticCallback(bot, PUBLIC_CALLBACKS.HELP, helpCallback);
}

export function registerAdminCallbacks(bot: Bot<Context>): void {
  registerStaticCallback(
    bot,
    ADMIN_CALLBACKS.REFRESH_STATS,
    isAdmin,
    refreshStatsCallback,
  );
  registerStaticCallback(
    bot,
    ADMIN_CALLBACKS.BROADCAST_CANCEL,
    isAdmin,
    broadcastCancelCallback,
  );

  bot.callbackQuery(
    ADMIN_CALLBACKS.BROADCAST_SEND.regex,
    isAdmin,
    broadcastSendCallback,
  );
  bot.callbackQuery(
    ADMIN_CALLBACKS.BROADCAST_RETRY.regex,
    isAdmin,
    broadcastRetryCallback,
  );
}
