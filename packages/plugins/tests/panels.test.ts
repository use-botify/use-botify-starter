import type { CallbackQueryContext, Context } from "grammy"
import { describe, expect, it, vi } from "vitest"

import {
  buildGuidePanel,
  buildPanelGreeting,
  closeMessageCallback,
  createCloseMessageCallback,
  formatUserMention,
  getGuidePanelItem,
} from "../src/panels"

describe("panels helpers", () => {
  it("formats HTML-safe mentions and role greetings", () => {
    expect(
      formatUserMention({ username: "sahil_dev", first_name: "Sahil" })
    ).toBe("@sahil_dev")
    expect(formatUserMention({ first_name: "A <script>" })).toBe(
      "A &lt;script&gt;"
    )
    expect(formatUserMention(undefined, "@guest")).toBe("@guest")

    const greeting = buildPanelGreeting({
      role: "admin",
      user: { username: "sahil", first_name: "Sahil" },
      description: "Choose an action below.",
    })
    expect(greeting).toBe("Hey admin, <b>@sahil</b>\n\nChoose an action below.")

    expect(buildPanelGreeting({ user: { first_name: "Alex" } })).toBe(
      "Hey, <b>Alex</b>"
    )
  })

  it("builds HTML guide panels with optional execute buttons and safe lookup", () => {
    const guides = {
      add_icon: {
        route: "/add_icon <key> <emoji>",
        useCase: "Register custom Telegram emoji icons.",
        steps: ["Send a custom emoji", "Pick a snake_case key"],
      },
    } as const

    expect(getGuidePanelItem(guides, "add_icon")?.route).toBe(
      "/add_icon <key> <emoji>"
    )
    expect(getGuidePanelItem(guides, "toString")).toBeUndefined()

    const built = buildGuidePanel(
      guides.add_icon,
      { execute: "dev:exec:add_icon", back: "dev:home" },
      {
        buildButton: (kind, label, callbackData) => ({
          text: label,
          callback_data: callbackData,
          icon_custom_emoji_id: kind === "execute" ? "111" : "222",
        }),
      }
    )

    expect(built.text).toContain(
      "<b>Command:</b> <code>/add_icon &lt;key&gt; &lt;emoji&gt;</code>"
    )
    expect(built.text).toContain("1. Send a custom emoji")
    expect(built.text).toContain("2. Pick a snake_case key")

    const rows = built.keyboard.inline_keyboard
    expect(rows).toHaveLength(2)
    expect(rows[0]?.[0]).toMatchObject({
      text: "Execute Command",
      callback_data: "dev:exec:add_icon",
      icon_custom_emoji_id: "111",
    })
    expect(rows[1]?.[0]).toMatchObject({
      text: "Back",
      callback_data: "dev:home",
      icon_custom_emoji_id: "222",
    })
  })

  it("deletes messages on close and clears markup when deletion fails", async () => {
    const okCtx = {
      answerCallbackQuery: vi.fn(async () => true),
      deleteMessage: vi.fn(async () => true),
      editMessageReplyMarkup: vi.fn(async () => true),
    } as unknown as CallbackQueryContext<Context>

    await closeMessageCallback(okCtx, { answerText: "Closed" })
    expect(okCtx.answerCallbackQuery).toHaveBeenCalledWith({ text: "Closed" })
    expect(okCtx.deleteMessage).toHaveBeenCalledTimes(1)
    expect(okCtx.editMessageReplyMarkup).not.toHaveBeenCalled()

    const fallbackCtx = {
      answerCallbackQuery: vi.fn(async () => true),
      deleteMessage: vi.fn(async () => {
        throw new Error("message can't be deleted")
      }),
      editMessageReplyMarkup: vi.fn(async () => true),
    } as unknown as CallbackQueryContext<Context>

    const handler = createCloseMessageCallback()
    await handler(fallbackCtx)
    expect(fallbackCtx.editMessageReplyMarkup).toHaveBeenCalledTimes(1)
  })
})
