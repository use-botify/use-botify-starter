import { type Context, GrammyError, HttpError } from "grammy";
import {
  type BroadcastTarget,
  ADMIN_CALLBACKS,
  TypedInlineKeyboard,
} from "@/lib/callbacks";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let isBroadcasting = false;

export async function broadcastCancelCallback(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery({ text: "Broadcast cancelled." });
  await ctx.editMessageText("❌ *Broadcast cancelled.*", {
    parse_mode: "Markdown",
  });
}

export async function broadcastSendCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.chat) return;

  if (isBroadcasting) {
    await ctx.answerCallbackQuery({
      text: "⏳ A broadcast is already running!",
      show_alert: true,
    });
    return;
  }

  const parsed = ADMIN_CALLBACKS.BROADCAST_SEND.parse(data);
  if (!parsed) {
    await ctx.answerCallbackQuery({ text: "⚠️ Invalid broadcast data." });
    return;
  }

  const { target, messageId } = parsed;
  const targets = await fetchAudience(target);

  if (targets.length === 0) {
    await ctx.answerCallbackQuery({
      text: `⚠️ No active ${target} found to broadcast.`,
      show_alert: true,
    });
    return;
  }

  // Create persistent broadcast job & recipient rows in DB before sending
  const job = await db.broadcast.create({
    data: {
      fromChatId: BigInt(ctx.chat.id),
      messageId,
      target,
      status: "RUNNING",
      recipients: {
        createMany: {
          data: targets.map((t) => ({
            targetId: t.id,
            targetType: t.type,
            label: t.label,
            status: "PENDING",
          })),
        },
      },
    },
  });

  await ctx.answerCallbackQuery({ text: `🚀 Broadcast #${job.id} started!` });
  await executeBroadcastJob(ctx, job.id);
}

export async function broadcastRetryCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  if (isBroadcasting) {
    await ctx.answerCallbackQuery({
      text: "⏳ Another broadcast is currently running!",
      show_alert: true,
    });
    return;
  }

  const parsed = ADMIN_CALLBACKS.BROADCAST_RETRY.parse(data);
  if (!parsed) {
    await ctx.answerCallbackQuery({ text: "⚠️ Invalid retry data." });
    return;
  }

  await ctx.answerCallbackQuery({
    text: `🔄 Retrying Broadcast #${parsed.broadcastId}...`,
  });
  await executeBroadcastJob(ctx, parsed.broadcastId);
}

async function executeBroadcastJob(
  ctx: Context,
  broadcastId: number,
): Promise<void> {
  isBroadcasting = true;
  const startTime = Date.now();

  try {
    const job = await db.broadcast.findUnique({
      where: { id: broadcastId },
    });

    if (!job) {
      await ctx.editMessageText("⚠️ *Broadcast job not found in database.*", {
        parse_mode: "Markdown",
      });
      return;
    }

    await db.broadcast.update({
      where: { id: broadcastId },
      data: { status: "RUNNING" },
    });

    // Fetch only recipients that haven't received the message yet (PENDING or FAILED)
    const pendingRecipients = await db.broadcastRecipient.findMany({
      where: {
        broadcastId,
        status: { in: ["PENDING", "FAILED"] },
      },
    });

    const totalCount = await db.broadcastRecipient.count({
      where: { broadcastId },
    });

    await ctx
      .editMessageText(
        `🚀 *Broadcasting (#${broadcastId}) to${job.target.toUpperCase()}...*\n\n` +
          `⏳ Remaining to send: \`${pendingRecipients.length} / ${totalCount}\``,
        { parse_mode: "Markdown" },
      )
      .catch(() => {});

    for (let i = 0; i < pendingRecipients.length; i++) {
      const recipient = pendingRecipients[i];
      const result = await sendToRecipient(
        ctx,
        recipient.targetId,
        Number(job.fromChatId),
        job.messageId,
        recipient.targetType as "user" | "chat",
      );

      await db.broadcastRecipient.update({
        where: { id: recipient.id },
        data: {
          status: result.status,
          error: result.error ?? null,
        },
      });

      // If a network disconnect (HttpError) happens, abort loop so admin can retry when online
      if (result.isNetworkError) {
        throw new Error(`Network connection lost: ${result.error}`);
      }

      if ((i + 1) % 20 === 0 && i + 1 < pendingRecipients.length) {
        await ctx
          .editMessageText(
            `🚀 *Broadcasting (#${broadcastId})...*\n\n` +
              `⏳ Processed: \`${i + 1} / ${pendingRecipients.length}\``,
            { parse_mode: "Markdown" },
          )
          .catch(() => {});
      }

      await sleep(40); // 25 msg/sec rate limit protection
    }

    await db.broadcast.update({
      where: { id: broadcastId },
      data: { status: "COMPLETED" },
    });
  } catch (err) {
    logger.error(
      "BroadcastHandler",
      `Broadcast #${broadcastId} interrupted`,
      err,
    );
    await db.broadcast
      .update({
        where: { id: broadcastId },
        data: { status: "INTERRUPTED" },
      })
      .catch(() => {});
  } finally {
    isBroadcasting = false;
    await renderBroadcastReport(ctx, broadcastId, startTime);
  }
}

async function renderBroadcastReport(
  ctx: Context,
  broadcastId: number,
  startTime: number,
): Promise<void> {
  const job = await db.broadcast.findUnique({
    where: { id: broadcastId },
    include: { recipients: true },
  });

  if (!job) return;

  const sent = job.recipients.filter((r) => r.status === "SENT");
  const blocked = job.recipients.filter((r) => r.status === "BLOCKED");
  const notBroadcasted = job.recipients.filter((r) =>
    ["PENDING", "FAILED"].includes(r.status),
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const isInterrupted =
    job.status === "INTERRUPTED" || notBroadcasted.length > 0;

  // Format list of users/chats who did not get the broadcast (up to 15 shown inline)
  const missedPreview = notBroadcasted
    .slice(0, 15)
    .map(
      (r) => `• \`${r.targetId}\` (${r.label ?? r.targetType}) — _${r.status}_`,
    )
    .join("\n");

  const missedSection =
    notBroadcasted.length > 0
      ? `\n\n⚠️ *Not Broadcasted (${notBroadcasted.length}):*\n${missedPreview}` +
        (notBroadcasted.length > 15
          ? `\n_...and ${notBroadcasted.length - 15} more_`
          : "")
      : "";

  const reportText =
    `${isInterrupted ? "⚠️ *Broadcast Interrupted / Incomplete*" : "✅ *Broadcast Completed*"}\n\n` +
    `🆔 *Broadcast ID:* \`#${job.id}\`\n` +
    `🎯 *Target:* \`${job.target.toUpperCase()}\`\n` +
    `📨 *Total Audience:* \`${job.recipients.length}\`\n` +
    `✅ *Delivered:* \`${sent.length}\`\n` +
    `🚫 *Blocked / Inactive:* \`${blocked.length}\`\n` +
    `❌ *Failed / Not Sent:* \`${notBroadcasted.length}\`\n` +
    `⏱️ *Duration:* \`${durationSec}s\`` +
    missedSection;

  const keyboard = new TypedInlineKeyboard();
  if (notBroadcasted.length > 0) {
    keyboard.text(
      `🔄 Retry Failed / Remaining (${notBroadcasted.length})`,
      ADMIN_CALLBACKS.BROADCAST_RETRY.build(job.id),
    );
  }

  await ctx
    .editMessageText(reportText, {
      parse_mode: "Markdown",
      reply_markup: notBroadcasted.length > 0 ? keyboard : undefined,
    })
    .catch(async () => {
      // If editing fails after a connection drop, send as a new message
      await ctx
        .reply(reportText, {
          parse_mode: "Markdown",
          reply_markup: notBroadcasted.length > 0 ? keyboard : undefined,
        })
        .catch(() => {});
    });
}

async function fetchAudience(
  target: BroadcastTarget,
): Promise<Array<{ id: bigint; type: "user" | "chat"; label: string }>> {
  const list: Array<{ id: bigint; type: "user" | "chat"; label: string }> = [];

  if (target === "users" || target === "all") {
    const users = await db.user.findMany({ where: { isActive: true } });
    list.push(
      ...users.map((u) => ({
        id: u.id,
        type: "user" as const,
        label: u.username ? `@${u.username}` : (u.firstName ?? "User"),
      })),
    );
  }

  if (target === "channels" || target === "all") {
    const channels = await db.chat.findMany({
      where: { type: "channel", isActive: true },
    });
    list.push(
      ...channels.map((c) => ({
        id: c.id,
        type: "chat" as const,
        label: c.title ?? "Channel",
      })),
    );
  }

  if (target === "groups" || target === "all") {
    const groups = await db.chat.findMany({
      where: { type: { in: ["group", "supergroup"] }, isActive: true },
    });
    list.push(
      ...groups.map((g) => ({
        id: g.id,
        type: "chat" as const,
        label: g.title ?? "Group",
      })),
    );
  }

  return list;
}

async function sendToRecipient(
  ctx: Context,
  targetId: bigint,
  fromChatId: number,
  messageId: number,
  targetType: "user" | "chat",
): Promise<{
  status: "SENT" | "BLOCKED" | "FAILED";
  error?: string;
  isNetworkError?: boolean;
}> {
  try {
    await ctx.api.copyMessage(targetId.toString(), fromChatId, messageId);
    return { status: "SENT" };
  } catch (err) {
    if (err instanceof HttpError) {
      return {
        status: "FAILED",
        error: err.message,
        isNetworkError: true,
      };
    }

    if (err instanceof GrammyError) {
      // Flood wait: sleep and retry once
      if (err.error_code === 429 && err.parameters?.retry_after) {
        const waitMs = (err.parameters.retry_after + 1) * 1000;
        await sleep(waitMs);
        try {
          await ctx.api.copyMessage(targetId.toString(), fromChatId, messageId);
          return { status: "SENT" };
        } catch (retryErr) {
          return { status: "FAILED", error: String(retryErr) };
        }
      }

      // User blocked bot (403) or chat deleted/kicked (400) -> set isActive = false
      if (err.error_code === 403 || err.error_code === 400) {
        if (targetType === "user") {
          await db.user
            .update({ where: { id: targetId }, data: { isActive: false } })
            .catch(() => {});
        } else {
          await db.chat
            .update({ where: { id: targetId }, data: { isActive: false } })
            .catch(() => {});
        }
        return { status: "BLOCKED", error: err.description };
      }

      return { status: "FAILED", error: err.description };
    }

    return { status: "FAILED", error: String(err) };
  }
}
