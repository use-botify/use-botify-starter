# @use-botify/core

Core bot runtime, token verification, graceful shutdown lifecycle, and built-in grammY middlewares for the Botify Telegram framework.

## Features

- **Framework entry runtime** — `createBot` and `defineBotConfig` validate your token, verify via `getMe`, start polling, and manage status transitions cleanly.
- **Graceful shutdown** — idempotent `SIGINT`/`SIGTERM` handling with configurable timeout guards and dynamic `app.onShutdown(...)` cleanup hooks.
- **Built-in middlewares** — `autoAnswerCallback`, sliding-window `rateLimiter`, `createErrorHandler`, and hot-swappable `createHmrDispatcher`.
- **Zero lock-in** — `grammy` is a peer dependency; bring your own logger, database, and access guards via typed hooks.

## Installation

```bash
pnpm add @use-botify/core grammy
```
