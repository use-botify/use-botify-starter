
# @botify/icons

Typed Telegram custom-emoji icons for Botify bots: one registry, one set of helpers.

```ts
import { iconCallbackButton, iconUrlButton, renderIcon } from "@botify/icons"

// Inline keyboard buttons with a custom emoji icon
const back = iconCallbackButton("back", "Back", "nav:back")
const help = iconUrlButton("chat", "Help", "https://t.me/your_support")

// HTML text with a custom emoji (send with parse_mode: "HTML")
const text = `${renderIcon("diamond")} Boost purchased`
```

Icon names are typed: `iconCallbackButton("typo", ...)` is a compile error.

## Your own icons

```ts
import { createIconRegistry, type IconDetail } from "@botify/icons"

const brand: IconDetail = {
  key: "brand",
  customEmojiId: "5443038326535759644",
  fallback: "⭐",
  capturedAt: "2026-11-18T00:00:00.000Z",
}

export const icons = createIconRegistry({ brand })

icons.renderIcon("brand") // typed: defaults + "brand"
```

An icon with the same key as a default replaces it. Entries are validated when the
registry is created.

## Adding a default icon

Capture it with `/grab_icon` in a bot, then paste the entry into
`src/registry/default-icons.ts`. The key must equal the entry's `key` field, in
lowercase snake_case (`normalizeIconKey` shows the rule).

## Scripts

`pnpm build` · `pnpm typecheck` · `pnpm test`