import type { Bot, Context } from "grammy";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export function registerChatMemberHandlers(bot: Bot<Context>): void {
  bot.on("my_chat_member", async (ctx) => {
    const chat = ctx.chat;
    const newStatus = ctx.myChatMember.new_chat_member.status;
    const isActive = newStatus === "member" || newStatus === "administrator";
    const chatId = BigInt(chat.id);

    if (chat.type === "private") {
      const from = ctx.from;
      try {
        await db.user.upsert({
          where: { id: chatId },
          update: {
            username: from.username ?? null,
            firstName: from.first_name,
            isActive,
          },
          create: {
            id: chatId,
            username: from.username ?? null,
            firstName: from.first_name,
            isActive,
          },
        });

        logger.info(
          "ChatMember",
          `User ${isActive ? "unblocked/started" : "blocked"} the bot`,
          { userId: chat.id, isActive },
        );
      } catch (err) {
        logger.error("ChatMember", "Failed to update user status", {
          userId: chat.id,
          error: err,
        });
      }
      return;
    }

    const title = "title" in chat ? chat.title : null;
    const username = "username" in chat ? (chat.username ?? null) : null;

    try {
      await db.chat.upsert({
        where: { id: chatId },
        update: {
          type: chat.type,
          title,
          username,
          isActive,
        },
        create: {
          id: chatId,
          type: chat.type,
          title,
          username,
          isActive,
        },
      });

      logger.info(
        "ChatMember",
        `Bot status in ${chat.type} updated to ${newStatus}`,
        {
          chatId: chat.id,
          title,
          isActive,
        },
      );
    } catch (err) {
      logger.error("ChatMember", "Failed to upsert chat in database", {
        chatId: chat.id,
        error: err,
      });
    }
  });

  bot.on("message:migrate_to_chat_id", async (ctx) => {
    const oldChatId = BigInt(ctx.chat.id);
    const newChatId = BigInt(ctx.message.migrate_to_chat_id);

    try {
      await db.chat
        .update({
          where: { id: oldChatId },
          data: { isActive: false },
        })
        .catch(() => {});

      logger.info(
        "ChatMember",
        "Group upgraded to supergroup; old ID deactivated",
        {
          oldChatId,
          newChatId,
        },
      );
    } catch (err) {
      logger.error("ChatMember", "Failed to handle group migration", err);
    }
  });
}
