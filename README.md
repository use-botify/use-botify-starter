# Use Botify

A modular TypeScript framework and CLI scaffolder for building Next.js-style **grammY** Telegram bots with file-based routing, zero-restart Vite HMR, typed custom emoji icons, and strict Zod configs.

## Quick Start

Scaffold a new Telegram bot in seconds:

```bash
pnpm create use-botify
```

```bash
npx create-use-botify@latest
```

```bash
bun create use-botify
```

> Requires **Node.js `>=24.0.0`**.

## Packages

| Package                                                                    | Version | Description                                                                      | Path                                                 |
| :------------------------------------------------------------------------- | :------ | :------------------------------------------------------------------------------- | :--------------------------------------------------- |
| [`create-use-botify`](https://www.npmjs.com/package/create-use-botify)     | `0.1.0` | Interactive CLI scaffolder and programmatic template engine                      | [`apps/create-use-botify`](./apps/create-use-botify) |
| [`@use-botify/core`](https://www.npmjs.com/package/@use-botify/core)       | `0.1.0` | Bot runtime, structured logger, graceful shutdown, and HMR dispatcher            | [`packages/core`](./packages/core)                   |
| [`@use-botify/router`](https://www.npmjs.com/package/@use-botify/router)   | `0.1.0` | File-based `features/` router with `(tier)` route groups and `[param]` callbacks | [`packages/router`](./packages/router)               |
| [`@use-botify/tooling`](https://www.npmjs.com/package/@use-botify/tooling) | `0.1.0` | Vite SSR feature HMR, `routes.d.ts` typegen, and atomic icon registry codegen    | [`packages/tooling`](./packages/tooling)             |
| [`@use-botify/plugins`](https://www.npmjs.com/package/@use-botify/plugins) | `0.1.0` | Magic-byte image `file_id` caching, HTML UI panels, and custom emoji tools       | [`packages/plugins`](./packages/plugins)             |
| [`@use-botify/icons`](https://www.npmjs.com/package/@use-botify/icons)     | `1.0.0` | Typed Telegram custom emoji registry and inline keyboard button builders         | [`packages/icons`](./packages/icons)                 |

## Repository Structure

```text
.
├── apps/
│   ├── create-use-botify/   # Interactive CLI scaffolder
│   └── web/                 # Landing page & Fumadocs documentation (Next.js 16)
├── packages/
│   ├── core/                # @use-botify/core
│   ├── router/              # @use-botify/router
│   ├── tooling/             # @use-botify/tooling
│   ├── plugins/             # @use-botify/plugins
│   ├── icons/               # @use-botify/icons
│   └── ...                  # Shared internal @workspace/* configs & utilities
└── scripts/                 # Monorepo maintenance & check scripts
```

## Local Development

```bash
git clone [https://github.com/use-botify/use-botify-starter.git](https://github.com/use-botify/use-botify-starter.git)
cd use-botify-starter
pnpm install
```

Common workspace commands:

```bash
pnpm dev:web            # Run apps/web (landing page + /docs) locally
pnpm test               # Run Vitest across all packages
pnpm check              # Run Biome lint & format check
pnpm check:fix          # Auto-fix Biome lint & format issues
pnpm script:check:all   # Full Biome + TypeScript monorepo verification
```

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request, and please follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

To report a security vulnerability, please follow the process in [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © 2026 Use Botify (Sahil Kumar)
