// src/handlers/callbacks.ts
import type { Bot, Context } from "grammy";
import {
  adminPanelCallback,
  broadcastCancelCallback,
  broadcastInfoCallback,
  broadcastRetryCallback,
  broadcastSendCallback,
  refreshStatsCallback,
  toggleMaintenanceCallback,
} from "@/callbacks/admin";
import { helpCallback } from "@/callbacks/public";
import {
  ADMIN_CALLBACKS,
  PUBLIC_CALLBACKS,
  registerStaticCallback,
} from "@/lib/callbacks";
import { isAdmin } from "@/middlewares/is-admin";

export function registerPublicCallbacks(bot: Bot<Context>): void {
  registerStaticCallback(bot, PUBLIC_CALLBACKS.HELP, helpCallback);
}

export function registerAdminCallbacks(bot: Bot<Context>): void {
  registerStaticCallback(
    bot,
    ADMIN_CALLBACKS.PANEL,
    isAdmin,
    adminPanelCallback,
  );
  registerStaticCallback(
    bot,
    ADMIN_CALLBACKS.TOGGLE_MAINTENANCE,
    isAdmin,
    toggleMaintenanceCallback,
  );
  registerStaticCallback(
    bot,
    ADMIN_CALLBACKS.BROADCAST_INFO,
    isAdmin,
    broadcastInfoCallback,
  );
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
