import { type Context, GrammyError, type NextFunction } from "grammy";
import { env } from "@/config/env";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isUserAdmin } from "@/middlewares/is-admin";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let maintenanceEnabled = false;
let isNotifyingMaintenance = false;

export function isMaintenanceMode(): boolean {
  return maintenanceEnabled;
}

export function isMaintenanceNotificationRunning(): boolean {
  return isNotifyingMaintenance;
}

export function setMaintenanceMode(state: boolean): void {
  maintenanceEnabled = state;
}

export async function maintenanceMiddleware(
  ctx: Context,
  next: NextFunction,
): Promise<void> {
  if (!maintenanceEnabled || isUserAdmin(ctx.from?.id)) {
    await next();
    return;
  }

  if (!ctx.message && !ctx.callbackQuery) {
    return;
  }

  logger.info("MaintenanceGuard", "Blocked user request during maintenance", {
    userId: ctx.from?.id,
  });

  const maintenanceText =
    "🛠️ *Under Maintenance*\n\n" +
    "The bot is currently undergoing scheduled maintenance. " +
    "We will notify you as soon as it is back online!";

  if (ctx.callbackQuery) {
    await ctx
      .answerCallbackQuery({
        text: "🛠️ Bot is under maintenance. We'll notify you when it's back!",
        show_alert: true,
      })
      .catch(() => {});
    return;
  }

  if (ctx.chat?.type === "private") {
    await ctx
      .reply(maintenanceText, { parse_mode: "Markdown" })
      .catch(() => {});
  }
}

export async function broadcastMaintenanceNotice(
  ctx: Context,
  isEnteringMaintenance: boolean,
): Promise<{ total: number; sent: number; failed: number }> {
  isNotifyingMaintenance = true;

  const messageText = isEnteringMaintenance
    ? "🛠️ *Scheduled Maintenance*\n\n" +
      "The bot is now entering maintenance mode for system upgrades and improvements. " +
      "Commands and features are temporarily paused.\n\n" +
      "🔔 _We will send you a notification as soon as the bot is back online!_"
    : "✅ *Maintenance Complete — Bot is Back Online!*\n\n" +
      "All systems and channel boosting tools are now fully operational again. " +
      "Thank you for your patience!\n\n" +
      "👉 Use /start or /help to continue.";

  let sent = 0;
  let failed = 0;

  try {
    const activeUsers = await db.user.findMany({
      where: {
        isActive: true,
        id: { not: BigInt(env.ADMIN_ID) },
      },
      select: { id: true },
    });

    for (const user of activeUsers) {
      const delivered = await sendNoticeSafe(ctx, user.id, messageText);
      if (delivered) {
        sent++;
      } else {
        failed++;
      }

      await sleep(40);
    }

    return { total: activeUsers.length, sent, failed };
  } finally {
    isNotifyingMaintenance = false;
  }
}

async function sendNoticeSafe(
  ctx: Context,
  userId: bigint,
  text: string,
): Promise<boolean> {
  try {
    await ctx.api.sendMessage(userId.toString(), text, {
      parse_mode: "Markdown",
    });
    return true;
  } catch (err) {
    if (err instanceof GrammyError) {
      if (err.error_code === 429 && err.parameters?.retry_after) {
        const waitMs = (err.parameters.retry_after + 1) * 1000;
        logger.warn(
          "MaintenanceBroadcast",
          `Rate limited by Telegram. Sleeping ${waitMs}ms`,
        );
        await sleep(waitMs);
        try {
          await ctx.api.sendMessage(userId.toString(), text, {
            parse_mode: "Markdown",
          });
          return true;
        } catch {
          return false;
        }
      }

      if (err.error_code === 403 || err.error_code === 400) {
        await db.user
          .update({ where: { id: userId }, data: { isActive: false } })
          .catch(() => {});
      }
    }
    return false;
  }
}
