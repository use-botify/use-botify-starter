import type { Context } from "grammy";
import { logger } from "@/lib/logger";

export async function helpCallback(ctx: Context): Promise<void> {
  logger.info("CallbackHandler", "Executing public:help callback", {
    userId: ctx.from?.id,
  });

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "📖 *Help & Commands*\n\nUse /start to initialize your account and access channel boosting tools.",
    { parse_mode: "Markdown" },
  );
}
