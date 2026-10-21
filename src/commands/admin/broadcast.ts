import type { Context } from "grammy";
import { ADMIN_CALLBACKS, TypedInlineKeyboard } from "@/lib/callbacks";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function broadcastCommand(ctx: Context): Promise<void> {
  const interrupted = await db.broadcast.findFirst({
    where: { status: { in: ["RUNNING", "INTERRUPTED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      recipients: true,
    },
  });

  const replyMessage = ctx.message?.reply_to_message;

  if (!replyMessage) {
    if (interrupted) {
      const sent = interrupted.recipients.filter(
        (r) => r.status === "SENT",
      ).length;
      const remaining = interrupted.recipients.filter((r) =>
        ["PENDING", "FAILED"].includes(r.status),
      ).length;

      if (remaining > 0) {
        const retryKeyboard = new TypedInlineKeyboard()
          .text(
            `🔄 Resume Broadcast #${interrupted.id} (${remaining} left)`,
            ADMIN_CALLBACKS.BROADCAST_RETRY.build(interrupted.id),
          )
          .row()
          .text("❌ Cancel", ADMIN_CALLBACKS.BROADCAST_CANCEL);

        await ctx.reply(
          `⚠️ *Interrupted Broadcast Detected (#${interrupted.id})*\n\n` +
            `• *Target:* \`${interrupted.target.toUpperCase()}\`\n` +
            `• *Already Sent:* \`${sent}\`\n` +
            `• *Not Broadcasted Yet:* \`${remaining}\`\n\n` +
            `Click below to resend to the remaining recipients, or reply to a new message with \`/broadcast\`.`,
          { parse_mode: "Markdown", reply_markup: retryKeyboard },
        );
        return;
      }
    }

    await ctx.reply(
      "📢 *How to Broadcast:*\n\n" +
        "1. Send or forward any message to this chat.\n" +
        "2. *Reply* to that message with `/broadcast`.\n" +
        "3. Choose your target audience.",
      { parse_mode: "Markdown" },
    );
    return;
  }

  logger.info("BroadcastHandler", "Preparing broadcast menu", {
    adminId: ctx.from?.id,
    targetMessageId: replyMessage.message_id,
  });

  const [usersCount, channelsCount, groupsCount] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.chat.count({ where: { type: "channel", isActive: true } }),
    db.chat.count({
      where: { type: { in: ["group", "supergroup"] }, isActive: true },
    }),
  ]);

  const totalCount = usersCount + channelsCount + groupsCount;
  const msgId = replyMessage.message_id;

  const keyboard = new TypedInlineKeyboard()
    .text(
      `👤 Users (${usersCount})`,
      ADMIN_CALLBACKS.BROADCAST_SEND.build("users", msgId),
    )
    .text(
      `📢 Channels (${channelsCount})`,
      ADMIN_CALLBACKS.BROADCAST_SEND.build("channels", msgId),
    )
    .row()
    .text(
      `👥 Groups (${groupsCount})`,
      ADMIN_CALLBACKS.BROADCAST_SEND.build("groups", msgId),
    )
    .text(
      `🌐 All (${totalCount})`,
      ADMIN_CALLBACKS.BROADCAST_SEND.build("all", msgId),
    )
    .row()
    .text("❌ Cancel", ADMIN_CALLBACKS.BROADCAST_CANCEL);

  await ctx.reply(
    `📣 *Broadcast Confirmation*\n\n` +
      `Select where you want to broadcast this message:\n\n` +
      `• *Active Users:* \`${usersCount}\`\n` +
      `• *Active Channels:* \`${channelsCount}\`\n` +
      `• *Active Groups:* \`${groupsCount}\`\n` +
      `• *Total Reach:* \`${totalCount}\``,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
      reply_parameters: { message_id: msgId },
    },
  );
}
