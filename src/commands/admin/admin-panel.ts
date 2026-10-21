import type { Context } from "grammy";
import {
  ADMIN_CALLBACKS,
  PUBLIC_CALLBACKS,
  TypedInlineKeyboard,
} from "@/lib/callbacks";
import { logger } from "@/lib/logger";
import { isMaintenanceMode } from "@/middlewares/maintenance";

export function buildAdminPanelMessage(): {
  text: string;
  keyboard: TypedInlineKeyboard;
} {
  const isMaintenance = isMaintenanceMode();
  const statusBadge = isMaintenance
    ? "🟢 ON (Users Blocked)"
    : "🔴 OFF (Bot Public)";
  const toggleLabel = isMaintenance
    ? "🔴 Disable Maintenance Mode"
    : "🟢 Enable Maintenance Mode";

  const text =
    `🛠️ *Admin Control Panel*\n\n` +
    `• *Maintenance Mode:* \`${statusBadge}\`\n\n` +
    `Select an action below to manage the bot:`;

  const keyboard = new TypedInlineKeyboard()
    .text(toggleLabel, ADMIN_CALLBACKS.TOGGLE_MAINTENANCE)
    .row()
    .text("📊 Bot Stats", ADMIN_CALLBACKS.REFRESH_STATS)
    .text("📢 Broadcast", ADMIN_CALLBACKS.BROADCAST_INFO)
    .row()
    .text("⬅️ Back to Help", PUBLIC_CALLBACKS.HELP);

  return { text, keyboard };
}

export async function adminCommand(ctx: Context): Promise<void> {
  logger.info("AdminHandler", "Executing /admin command", {
    userId: ctx.from?.id,
  });

  const { text, keyboard } = buildAdminPanelMessage();

  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}
