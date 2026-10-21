import type { Context } from "grammy";
import { ADMIN_CALLBACKS, TypedInlineKeyboard } from "@/lib/callbacks";
import { logger } from "@/lib/logger";
import { isUserAdmin } from "@/middlewares/is-admin";

export function buildHelpMessage(userId?: number): {
  text: string;
  keyboard?: TypedInlineKeyboard;
} {
  const text =
    "📖 *Help & Commands*\n\n" +
    "• /start — Initialize your account\n" +
    "• /help — View available commands and tools";

  if (isUserAdmin(userId)) {
    const keyboard = new TypedInlineKeyboard().text(
      "🛠️ Admin Panel",
      ADMIN_CALLBACKS.PANEL,
    );
    return { text, keyboard };
  }

  return { text };
}

export async function helpCommand(ctx: Context): Promise<void> {
  logger.info("HelpHandler", "Executing /help command", {
    userId: ctx.from?.id,
  });

  const { text, keyboard } = buildHelpMessage(ctx.from?.id);

  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}
