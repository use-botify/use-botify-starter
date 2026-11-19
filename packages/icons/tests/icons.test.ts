import { describe, expect, it } from "vitest"

import * as iconExports from "../src/index"
import {
  assertIconDetail,
  createIconRegistry,
  findIcon,
  getIcon,
  iconCallbackButton,
  iconUrlButton,
  isIconDetail,
  normalizeIconKey,
  renderIcon,
  renderIconTag,
} from "../src/utils"

function toExportName(key: string): string {
  const camel = key.replace(/_([a-z0-9])/g, (_, char: string) =>
    char.toUpperCase()
  )
  return `${camel}Icon`
}

describe("DEFAULT_ICONS pre-publish verification", () => {
  const entries = Object.entries(iconExports.DEFAULT_ICONS)

  it("validates every icon detail and enforces normalized keys", () => {
    expect(entries.length).toBeGreaterThan(0)

    for (const [key, detail] of entries) {
      expect(() => assertIconDetail(key, detail)).not.toThrow()
      expect(
        key,
        `Icon key "${key}" must already be normalized (expected "${normalizeIconKey(key)}")`
      ).toBe(normalizeIconKey(key))
    }
  })

  it("has no duplicate customEmojiId values", () => {
    const seen = new Map<string, string>()

    for (const [key, detail] of entries) {
      const existingKey = seen.get(detail.customEmojiId)
      expect(
        existingKey,
        `Duplicate customEmojiId "${detail.customEmojiId}" shared by "${existingKey}" and "${key}"`
      ).toBeUndefined()
      seen.set(detail.customEmojiId, key)
    }
  })

  it("exports a matching <name>Icon smart object for every icon", () => {
    const exportsMap = iconExports as Record<string, unknown>

    expect(Object.isFrozen(iconExports.icons)).toBe(true)

    for (const [key, detail] of entries) {
      const exportName = toExportName(key)
      const smartIcon = iconExports.icons[key as keyof typeof iconExports.icons]

      expect(
        exportsMap[exportName],
        `Missing or mismatched named export "${exportName}" in src/index.ts`
      ).toBe(smartIcon)
      expect(Object.isFrozen(smartIcon)).toBe(true)

      const expectedHtml = `<tg-emoji emoji-id="${detail.customEmojiId}">${detail.fallback}</tg-emoji>`
      expect(smartIcon.html).toBe(expectedHtml)
      expect(`${smartIcon}`).toBe(expectedHtml)
    }
  })
})

describe("icon helpers & custom registries", () => {
  it("escapes HTML safely in renderIconTag", () => {
    const html = renderIconTag({
      customEmojiId: "12345",
      fallback: `<>&"'`,
    })

    expect(html).toBe(
      '<tg-emoji emoji-id="12345">&lt;&gt;&amp;&quot;&#39;</tg-emoji>'
    )
  })

  it("normalizes arbitrary labels into snake_case keys", () => {
    expect(normalizeIconKey("  Arrow-Left! ")).toBe("arrow_left")
    expect(normalizeIconKey("USDT (TRC20)")).toBe("usdt_trc20")
  })

  it("guards lookups safely against missing and prototype keys", () => {
    expect(findIcon("chat")?.key).toBe("chat")
    expect(findIcon("non_existent")).toBeUndefined()
    expect(findIcon("toString")).toBeUndefined()
    expect(findIcon("__proto__")).toBeUndefined()

    expect(getIcon("settings").key).toBe("settings")
    expect(() => getIcon("missing" as never)).toThrow(/Unknown icon/)
  })

  it("builds callback and URL buttons from keys, smart icons, or undefined", () => {
    expect(iconCallbackButton("chat", "Open", "open_chat")).toEqual({
      text: "Open",
      callback_data: "open_chat",
      icon_custom_emoji_id: iconExports.chatIcon.customEmojiId,
    })

    expect(iconCallbackButton(iconExports.settingsIcon, "Settings")).toEqual({
      text: "Settings",
      callback_data: "noop",
      icon_custom_emoji_id: iconExports.settingsIcon.customEmojiId,
    })

    const noIconCallback = iconCallbackButton(undefined, "Plain", "plain")
    expect(noIconCallback).toEqual({ text: "Plain", callback_data: "plain" })
    expect("icon_custom_emoji_id" in noIconCallback).toBe(false)

    expect(
      iconUrlButton(iconExports.buyIcon, "Store", "https://example.com")
    ).toEqual({
      text: "Store",
      url: "https://example.com",
      icon_custom_emoji_id: iconExports.buyIcon.customEmojiId,
    })

    const noIconUrl = iconUrlButton(undefined, "Docs", "https://example.com")
    expect(noIconUrl).toEqual({ text: "Docs", url: "https://example.com" })
    expect("icon_custom_emoji_id" in noIconUrl).toBe(false)
  })

  it("supports custom icons and default overrides via createIconRegistry", () => {
    const registry = createIconRegistry({
      swap: {
        key: "swap",
        customEmojiId: "999000111222333444",
        fallback: "🔁",
      },
      chat: {
        key: "chat",
        customEmojiId: "111222333444555666",
        fallback: "🗨️",
      },
    })

    expect(`${registry.icons.swap}`).toBe(
      '<tg-emoji emoji-id="999000111222333444">🔁</tg-emoji>'
    )
    expect(registry.renderIcon("swap")).toBe(registry.icons.swap.html)
    expect(registry.renderIcon(registry.icons.swap)).toBe(
      registry.icons.swap.html
    )
    expect(registry.icons.chat.customEmojiId).toBe("111222333444555666")
    expect(registry.icons.settings.key).toBe("settings")
  })

  it("rejects malformed icons and mismatched keys up front", () => {
    expect(isIconDetail(null)).toBe(false)
    expect(
      isIconDetail({ key: "bad", customEmojiId: "abc", fallback: "🔥" })
    ).toBe(false)
    expect(
      isIconDetail({
        key: "bad",
        customEmojiId: "123",
        fallback: "🔥",
        capturedAt: "",
      })
    ).toBe(false)

    expect(() =>
      createIconRegistry({
        bad: {
          key: "wrong",
          customEmojiId: "123",
          fallback: "🔥",
        } as never,
      })
    ).toThrow(/stored under the wrong key/)

    expect(renderIcon(iconExports.chatIcon)).toBe(iconExports.chatIcon.html)
  })
})
