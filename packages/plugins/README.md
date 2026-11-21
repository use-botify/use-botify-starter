# @use-botify/plugins

Optional runtime plugins (image loading with `file_id` caching, reusable HTML UI panels, and custom emoji management commands) for the Botify Telegram framework (`grammY`).

## Features

- **Images (`@use-botify/plugins/images`)** — Disk-backed asset manifest with JPEG/PNG/WebP magic-byte verification, Telegram 10 MB limit checks, per-instance `file_id` caching, and automatic single-retry upload on stale file IDs.
- **UI Panels (`@use-botify/plugins/panels`)** — HTML-safe user mentions, role greetings, command guide panels with pluggable icon button builders, and graceful close-message callbacks.
- **Icon Tools (`@use-botify/plugins/icon-tools`)** — Custom Telegram emoji extraction and `/add_icon`, `/list_icons`, `/remove_icon` commands structurally compatible with `@use-botify/tooling/codegen`'s `createIconRegistryStore` and `@use-botify/router`'s `defineFeature`.

## Installation

```bash
pnpm add @use-botify/plugins grammy
```
