import { Bot } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";
import { describe, expect, it, vi } from "vitest";

import {
  createIconToolsPlugin,
  extractCustomEmoji,
  normalizeIconKey,
  renderCustomEmojiTag,
  resolveCandidateKey,
} from "../src/icon-tools";
import { BotifyPluginError } from "../src/index";
import type { IconToolEntry, IconToolsStore } from "../src/types";

const VALID_TOKEN = "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi";

const MOCK_BOT_INFO: UserFromGetMe = {
  id: 123456789,
  is_bot: true,
  first_name: "Botify Plugins",
  username: "botify_plugins_bot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  can_manage_bots: false,
  supports_join_request_queries: false,
};

function createMemoryStore(persistImpl: () => unknown = () => undefined) {
  const map = new Map<string, IconToolEntry>();
  const persist = vi.fn(persistImpl);

  const store: IconToolsStore = {
    get size() {
      return map.size;
    },
    getAll: () => Object.fromEntries(map.entries()),
    get: (key) => map.get(key),
    has: (key) => map.has(key),
    set: (key, entry) => {
      map.set(key, entry);
      return entry;
    },
    remove: (key) => map.delete(key),
    persist,
  };

  return { store, persist };
}

function createTestBot() {
  const apiCalls: { method: string; payload: Record<string, unknown> }[] = [];
  const bot = new Bot(VALID_TOKEN, { botInfo: MOCK_BOT_INFO });

  bot.api.config.use((_prev, method, payload) => {
    apiCalls.push({ method, payload: payload as Record<string, unknown> });

    if (method === "getCustomEmojiStickers") {
      return Promise.resolve({
        ok: true,
        result: [
          {
            file_id: "sticker_file_1",
            file_unique_id: "sticker_uniq_1",
            type: "custom_emoji",
            width: 512,
            height: 512,
            is_animated: false,
            is_video: false,
            emoji: "🚀",
            set_name: "BotifyPack",
            custom_emoji_id: "5443038326535759644",
          },
        ],
      } as never);
    }

    return Promise.resolve({ ok: true, result: true } as never);
  });

  return { bot, apiCalls };
}

describe("emoji extraction helpers", () => {
  it("normalizes keys, resolves candidate names, and renders escaped HTML tags", () => {
    expect(normalizeIconKey("  Boost-Rocket! ")).toBe("boost_rocket");
    expect(resolveCandidateKey("5443038326535759644", "My Icon")).toBe(
      "my_icon",
    );
    expect(resolveCandidateKey("5443038326535759644")).toBe("icon_759644");
    expect(renderCustomEmojiTag("5443038326535759644", "<🔥>")).toBe(
      '<tg-emoji emoji-id="5443038326535759644">&lt;🔥&gt;</tg-emoji>',
    );
  });

  it("extracts custom emoji from text entities and captions", () => {
    const extracted = extractCustomEmoji({
      message_id: 5,
      chat: { id: 100, type: "private", first_name: "Dev" },
      text: "/add_icon boost 🚀",
      entities: [
        { offset: 0, length: 9, type: "bot_command" },
        {
          offset: 16,
          length: 2,
          type: "custom_emoji",
          custom_emoji_id: "5443038326535759644",
        },
      ],
    });

    expect(extracted?.customEmojiId).toBe("5443038326535759644");
    expect(extracted?.fallback).toBe("🚀");
    expect(extracted?.source).toBe("text");
  });
});

describe("createIconToolsPlugin", () => {
  it("handles /add_icon, /list_icons, and /remove_icon end-to-end", async () => {
    const { store, persist } = createMemoryStore();
    const onIconSaved = vi.fn();
    const onIconRemoved = vi.fn();

    const plugin = createIconToolsPlugin({
      store,
      onIconSaved,
      onIconRemoved,
      logger: false,
    });

    expect(plugin.commands.map((cmd) => cmd.name)).toEqual([
      "add_icon",
      "list_icons",
      "remove_icon",
    ]);

    const { bot, apiCalls } = createTestBot();
    bot.use(plugin.middleware);

    // 1. Add an icon inline
    const addUpdate: Update = {
      update_id: 1,
      message: {
        message_id: 10,
        date: 1_700_000_000,
        chat: { id: 7, type: "private", first_name: "Dev" },
        from: { id: 7, is_bot: false, first_name: "Dev" },
        text: "/add_icon boost 🚀",
        entities: [
          { offset: 0, length: 9, type: "bot_command" },
          {
            offset: 16,
            length: 2,
            type: "custom_emoji",
            custom_emoji_id: "5443038326535759644",
          },
        ],
      },
    };

    await bot.handleUpdate(addUpdate);

    expect(store.get("boost")?.customEmojiId).toBe("5443038326535759644");
    expect(store.get("boost")?.sticker?.setName).toBe("BotifyPack");
    expect(onIconSaved).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);

    // 2. List icons
    const listUpdate: Update = {
      update_id: 2,
      message: {
        message_id: 11,
        date: 1_700_000_000,
        chat: { id: 7, type: "private", first_name: "Dev" },
        from: { id: 7, is_bot: false, first_name: "Dev" },
        text: "/list_icons",
        entities: [{ offset: 0, length: 11, type: "bot_command" }],
      },
    };

    await bot.handleUpdate(listUpdate);

    expect(apiCalls).toContainEqual(
      expect.objectContaining({
        method: "sendMessage",
        payload: expect.objectContaining({
          text: expect.stringContaining("Registered Icons (1)"),
        }),
      }),
    );

    // 3. Remove icon
    const removeUpdate: Update = {
      update_id: 3,
      message: {
        message_id: 12,
        date: 1_700_000_000,
        chat: { id: 7, type: "private", first_name: "Dev" },
        from: { id: 7, is_bot: false, first_name: "Dev" },
        text: "/remove_icon boost",
        entities: [{ offset: 0, length: 12, type: "bot_command" }],
      },
    };

    await bot.handleUpdate(removeUpdate);

    expect(store.size).toBe(0);
    expect(onIconRemoved).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("rolls back removal if store.persist() throws and rejects invalid command configs", async () => {
    const { store } = createMemoryStore(() => {
      throw new Error("disk full");
    });

    store.set("spark", {
      key: "spark",
      customEmojiId: "1234567890",
      fallback: "✨",
    });

    const plugin = createIconToolsPlugin({ store, logger: false });
    const { bot } = createTestBot();
    bot.use(plugin.middleware);

    const removeUpdate: Update = {
      update_id: 1,
      message: {
        message_id: 20,
        date: 1_700_000_000,
        chat: { id: 7, type: "private", first_name: "Dev" },
        from: { id: 7, is_bot: false, first_name: "Dev" },
        text: "/remove_icon spark",
        entities: [{ offset: 0, length: 12, type: "bot_command" }],
      },
    };

    await bot.handleUpdate(removeUpdate);
    expect(store.has("spark")).toBe(true);

    expect(() =>
      createIconToolsPlugin({
        store,
        commandNames: { add: "same", list: "same" },
      }),
    ).toThrow(BotifyPluginError);
  });
});
