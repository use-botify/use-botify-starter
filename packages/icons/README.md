# @use-botify/icons

Strongly-typed Telegram custom emoji icons, HTML renderers, and inline button builders for TypeScript Telegram bots (grammY, Telegraf, or raw Bot API). Zero runtime dependencies.

## Features

- **Smart icon objects** — drop directly into template strings (`` `${chatIcon} Welcome` ``) or read `.customEmojiId` for inline keyboard buttons.
- **3 clean entrypoints** — keep icon data, runtime helpers, and TypeScript types strictly separated for optimal tree-shaking.
- **Extensible registries** — merge or override built-in icons with full literal-key autocomplete via `createIconRegistry`.
- **Safe by default** — automatic HTML escaping for `parse_mode: "HTML"`, frozen icon objects, and upfront key/ID validation.

## Installation

```bash
pnpm add @use-botify/icons
```

```bash
npm install @use-botify/icons
```

> Requires Node.js `>=24.0.0` (ESM only).

## Entrypoints

| Import Path               | Purpose                                                                           |
| :------------------------ | :-------------------------------------------------------------------------------- |
| `@use-botify/icons`       | Named smart icons (`chatIcon`, `settingsIcon`, ...), `icons`, and `DEFAULT_ICONS` |
| `@use-botify/icons/utils` | Registry factory, renderers, inline button builders, and validators               |
| `@use-botify/icons/types` | TypeScript interfaces and utility types                                           |

## Quick Start

### Messages (`parse_mode: "HTML"`)

Every named icon precomputes its `<tg-emoji>` HTML tag and implements `toString()`, so it renders directly inside template literals:

```ts
import { chatIcon, shieldIcon } from "@use-botify/icons"

await ctx.reply(
  `${chatIcon} <b>Welcome!</b>\n${shieldIcon} Your session is protected.`,
  { parse_mode: "HTML" }
)
```

### Inline Keyboard Buttons

Use the helpers from `@use-botify/icons/utils`, or pass `.customEmojiId` directly:

```ts
import { buyIcon, settingsIcon } from "@use-botify/icons"
import { iconCallbackButton, iconUrlButton } from "@use-botify/icons/utils"

const keyboard = {
  inline_keyboard: [
    [
      iconCallbackButton(settingsIcon, "Settings", "open_settings"),
      iconCallbackButton("chat", "Support", "open_support"),
    ],
    [
      iconUrlButton(
        buyIcon,
        "Open Store",
        "[https://example.com](https://example.com)"
      ),
    ],
  ],
}
```

### Dynamic Lookups

Use `findIcon` for untrusted or dynamic keys—if it returns `undefined`, button builders omit `icon_custom_emoji_id` automatically:

```ts
import { findIcon, iconCallbackButton } from "@use-botify/icons/utils"

const icon = findIcon(userProvidedKey) // Icon | undefined
const button = iconCallbackButton(icon, "Continue", "next_step")
```

### Custom Icon Registries

Extend or override `DEFAULT_ICONS` with your own Telegram custom emoji IDs while keeping strict autocomplete and compile-time key checks:

```ts
import { createIconRegistry } from "@use-botify/icons/utils"

export const botIcons = createIconRegistry({
  swap: {
    key: "swap",
    customEmojiId: "999000111222333444",
    fallback: "🔁",
  },
})

const text = `${botIcons.icons.swap} Swap complete`
const btn = botIcons.iconCallbackButton("swap", "Swap Again", "swap:retry")
```

## Built-in Icons

| Key        | Named Export   | Fallback | Custom Emoji ID       |
| :--------- | :------------- | :------: | :-------------------- |
| `add`      | `addIcon`      |    ➕    | `5397916757333654639` |
| `alert`    | `alertIcon`    |    🚨    | `5395695537687123235` |
| `back`     | `backIcon`     |    ⬅️    | `5935829907572529929` |
| `buy`      | `buyIcon`      |    🛒    | `5431461452642806959` |
| `chat`     | `chatIcon`     |    💬    | `5443038326535759644` |
| `close`    | `closeIcon`    |    ❌    | `5210952531676504517` |
| `delete`   | `deleteIcon`   |    🗑     | `5445267414562389170` |
| `diamond`  | `diamondIcon`  |    💎    | `5431761159755688084` |
| `ethereum` | `ethereumIcon` |    💎    | `5371015538912835062` |
| `flash`    | `flashIcon`    |    ☄️    | `5224607267797606837` |
| `pencil`   | `pencilIcon`   |    ✏️    | `5395444784611480792` |
| `saved`    | `savedIcon`    |    🔖    | `5222444124698853913` |
| `settings` | `settingsIcon` |    ⚙️    | `5341715473882955310` |
| `shield`   | `shieldIcon`   |    🛡     | `5251203410396458957` |
| `solana`   | `solanaIcon`   |    💜    | `5370932637454084263` |
| `ton`      | `tonIcon`      |    💎    | `5305758346983286417` |
| `usdt`     | `usdtIcon`     |    🟠    | `5370638969065221371` |

## API Reference

### `@use-botify/icons`

- `<name>Icon` — frozen smart `Icon` objects (`key`, `customEmojiId`, `fallback`, `html`, `toString()`).
- `icons` — frozen map of all built-in smart `Icon` objects keyed by `DefaultIconKey`.
- `DEFAULT_ICONS` — raw `IconDetail` definitions for all built-in icons.

### `@use-botify/icons/utils`

- `createIconRegistry(extra?)` — creates a typed `IconRegistry` merging `DEFAULT_ICONS` with optional custom icons or overrides.
- `defaultRegistry` — prebuilt registry over `DEFAULT_ICONS`.
- `findIcon(key)` / `getIcon(key)` — safe lookup (`undefined` on miss) vs. strict lookup (throws on miss).
- `renderIcon(icon)` / `renderIconTag(icon)` — renders a `<tg-emoji>` HTML tag.
- `createIcon(detail)` — wraps an `IconDetail` into a frozen smart `Icon`.
- `iconCallbackButton(icon, text, callbackData?)` / `iconUrlButton(icon, text, url)` — builds Telegram inline keyboard button objects.
- `buildCallbackButton(icon, text, callbackData?)` / `buildUrlButton(icon, text, url)` — low-level button builders accepting `Pick<IconDetail, "customEmojiId"> | undefined`.
- `defineIcons(icons)` — preserves literal keys and enforces compile-time key/property alignment.
- `isIconDetail(value)` / `assertIconDetail(key, value)` — runtime type guard and assertion validator.
- `normalizeIconKey(value)` — normalizes strings into `snake_case` icon keys.
- `escapeHtml(value)` — escapes `&`, `<`, `>`, `"`, and `'` for Telegram HTML mode.

### `@use-botify/icons/types`

- `Icon`, `IconDetail`, `IconEntity`, `IconInput`, `DefaultIconKey`, `IconRegistry`, `IconCallbackButton`, `IconUrlButton`, `KeyedIconRecord`.

## License

MIT
