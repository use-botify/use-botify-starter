import type { Context } from "grammy";
import { buildAdminPanelMessage } from "@/commands/admin/admin-panel";
import { ADMIN_CALLBACKS, TypedInlineKeyboard } from "@/lib/callbacks";
import { logger } from "@/lib/logger";
import {
  broadcastMaintenanceNotice,
  isMaintenanceMode,
  isMaintenanceNotificationRunning,
  setMaintenanceMode,
} from "@/middlewares/maintenance";

export async function adminPanelCallback(ctx: Context): Promise<void> {
  logger.info("CallbackHandler", "Opening Admin Panel via callback", {
    userId: ctx.from?.id,
  });

  const { text, keyboard } = buildAdminPanelMessage();

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

export async function toggleMaintenanceCallback(ctx: Context): Promise<void> {
  if (isMaintenanceNotificationRunning()) {
    await ctx.answerCallbackQuery({
      text: "⏳ Maintenance notifications are still being sent to users. Please wait!",
      show_alert: true,
    });
    return;
  }

  const targetState = !isMaintenanceMode();

  if (targetState) {
    setMaintenanceMode(true);
  }

  logger.info("AdminHandler", `Toggling maintenance mode to ${targetState}`, {
    adminId: ctx.from?.id,
  });

  await ctx.answerCallbackQuery({
    text: targetState
      ? "🛠️ Maintenance ENABLED. Notifying all users..."
      : "📢 Sending 'Back Online' notice to users before disabling maintenance...",
    show_alert: false,
  });

  await ctx
    .editMessageText(
      targetState
        ? "🛠️ *Enabling Maintenance Mode...*\n\n⏳ Sending maintenance alert to all active users..."
        : "🟢 *Disabling Maintenance Mode...*\n\n⏳ Notifying all active users that the bot is back online...",
      { parse_mode: "Markdown" },
    )
    .catch(() => {});

  const report = await broadcastMaintenanceNotice(ctx, targetState);

  if (!targetState) {
    setMaintenanceMode(false);
  }

  const { text, keyboard } = buildAdminPanelMessage();

  const summaryBanner =
    `\n\n📬 *Last Maintenance Alert Summary:*\n` +
    `• Status: \`${targetState ? "MAINTENANCE ON" : "MAINTENANCE OFF"}\`\n` +
    `• Delivered: \`${report.sent} / ${report.total}\`\n` +
    `• Failed / Blocked: \`${report.failed}\``;

  await ctx
    .editMessageText(text + summaryBanner, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    })
    .catch(() => {});
}

export async function broadcastInfoCallback(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();

  const keyboard = new TypedInlineKeyboard().text(
    "⬅️ Back to Admin Panel",
    ADMIN_CALLBACKS.PANEL,
  );

  await ctx.editMessageText(
    "📢 *How to Broadcast a Message*\n\n" +
      "1. Send or forward any message (text, photo, video, or inline buttons) to this chat.\n" +
      "2. *Reply* to that message with `/broadcast`.\n" +
      "3. Choose your target audience (*Users*, *Channels*, *Groups*, or *All*).",
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    },
  );
}
