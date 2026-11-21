# @use-botify/router

File-based and typed dynamic callback routing for the Botify Telegram framework (`grammY`).

## Features

- **Next.js-style `features/` routing** — folders, `(tier)` route groups, and `[param]` segments automatically become commands, dynamic callbacks, and access-scoped features.
- **Typed dynamic callback routes** — `defineCallbackRoute("order:[id]:[action]")` (or `{id}`) infers exact param types at compile time and enforces Telegram's 64-byte callback payload limit.
- **Upfront validation** — catches invalid command names, missing feature prefixes, colliding callback patterns, and >100-command Telegram menus before polling starts.
- **Tiered access scopes & `/` menu sync** — pluggable role guards, unauthorized fallback guards, stale menu cleanup, and automatic `setMyCommands` syncing.

## Installation

```bash
pnpm add @use-botify/router grammy
```
