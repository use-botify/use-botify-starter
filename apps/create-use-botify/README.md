# create-use-botify

Scaffold a modular, Next.js-style Telegram bot powered by the **Botify** ecosystem and **grammY**.

## Quick Start

```bash
pnpm create use-botify

```

```bash
npx create-use-botify@latest

```

```bash
bun create use-botify

```

Or scaffold non-interactively with defaults:

```bash
pnpm create use-botify my-bot --yes

```

> Requires Node.js `>=24.0.0`.

## CLI Options

| Flag                             | Description                                                                   | Default  |
| -------------------------------- | ----------------------------------------------------------------------------- | -------- |
| `-y, --yes`                      | Skip prompts and scaffold with defaults                                       | `false`  |
| `--src` / `--no-src`             | Place source files inside `src/`                                              | `true`   |
| `--alias <pattern>`              | TypeScript & Vite import alias pattern (e.g. `@/*`, `~/*`)                    | `@/*`    |
| `--admin` / `--no-admin`         | Include `(admin)/panel` feature & `ADMIN_IDS` guard                           | `true`   |
| `--developer` / `--no-developer` | Include `(developer)` icon-tools (`/add_icon`, `/list_icons`, `/remove_icon`) | `true`   |
| `--images` / `--no-images`       | Include `@use-botify/plugins/images` manifest & `file_id` caching             | `false`  |
| `--pm <pm>`                      | Package manager (`pnpm`, `npm`, `yarn`, `bun`)                                | detected |
| `--skip-install`                 | Skip installing dependencies                                                  | `false`  |
| `--no-git`                       | Skip `git init`                                                               | `false`  |
| `--overwrite`                    | Allow scaffolding into a non-empty directory                                  | `false`  |
| `-v, --version`                  | Print CLI version                                                             | —        |
| `-h, --help`                     | Show CLI usage help                                                           | —        |

## What Gets Scaffolded

- **`@use-botify/core`** — Bot runtime, structured logger, graceful shutdown, and HMR middleware dispatcher.
- **`@use-botify/router`** — File-based `features/` convention (`command.ts`, `*.callback.ts`, `(admin)/`, `(developer)/`).
- **`@use-botify/tooling`** — Zero-restart Vite feature HMR and Next.js-style `routes.d.ts` typegen in development.
- **`@use-botify/plugins` & `@use-botify/icons**`— Optional admin panels, image`file_id` caching, and custom Telegram emoji registry commands.
- **Strict TypeScript + Biome + Zod** — Native Node 24 `.env` loading with strict environment validation out of the box.
