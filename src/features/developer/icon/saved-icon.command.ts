import type { BotCommandContext } from "@/core";
import {
  ICON_REGISTRY,
  type IconDetail,
  type IconKey,
  renderIcon,
} from "@/lib/icons";
import { escapeHtml } from "@/utils/escape-html";

const MAX_PAGE_LENGTH = 3_500;

export async function developerSavedIconCommand(
  ctx: BotCommandContext,
): Promise<void> {
  const EMPTY_REGISTRY_TEXT =
    "Your icon registry is empty. Reply to a message containing custom emoji with /add_icon <icon_name>.";

  const pages: string[] = [];
  let current = "";

  const lines = (Object.entries(ICON_REGISTRY) as [IconKey, IconDetail][]).map(
    ([key, icon], index) =>
      `${index + 1}. ${escapeHtml(key)} ${renderIcon(key)}\nID: ${escapeHtml(icon.customEmojiId)}`,
  );

  for (const line of lines) {
    const next = current ? `${current}\n\n${line}` : line;

    if (current && next.length > MAX_PAGE_LENGTH) {
      pages.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) pages.push(current);

  pages.map(
    (page, index) =>
      `${index === 0 ? "🎨 Registered Icons" : "🎨 Registered Icons (continued)"}\n\n${page}`,
  );

  if (pages.length === 0) {
    await ctx.reply(EMPTY_REGISTRY_TEXT);
    return;
  }

  for (const page of pages) {
    await ctx.reply(page, { parse_mode: "HTML" });
  }
}
