import type { Bot, Context } from "grammy";
import { refreshStatsCallback } from "@/callbacks/admin";
import { helpCallback } from "@/callbacks/public";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/middlewares/is-admin";

export function registerCallbacks(bot: Bot<Context>): void {
  // 1. Public Callbacks
  bot.callbackQuery("public:help", helpCallback);

  // 2. Admin Callbacks (Protected by isAdmin middleware)
  bot.callbackQuery("admin:refresh_stats", isAdmin, refreshStatsCallback);

  // 3. Fallback for unmatched/stale callback buttons
  bot.on("callback_query:data", async (ctx) => {
    logger.warn("CallbackHandler", "Unhandled callback query received", {
      userId: ctx.from?.id,
      data: ctx.callbackQuery.data,
    });

    await ctx
      .answerCallbackQuery({
        text: "⚠️ This button is no longer active.",
        show_alert: false,
      })
      .catch(() => {});
  });
}
