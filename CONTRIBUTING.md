# Contributing to Use Botify

Thanks for helping improve Use Botify. This repository is a `pnpm` + Turborepo monorepo using TypeScript, Biome, Vitest, tsdown, and Next.js 16.

## Prerequisites

- **Node.js `>=24.0.0`** (see `.nvmrc`)
- **pnpm** (`corepack enable` or install via `npm i -g pnpm`)

## Getting Started

1. Fork the repository and clone your fork:

   ```bash
   git clone [https://github.com/](https://github.com/)<your-username>/use-botify-starter.git
   cd use-botify-starter
   ```
2. Install dependencies:

   ```bash
   pnpm install
   ```
3. Create a branch for your change:

   ```bash
   git checkout -b feat/short-description
   ```

## Working on Packages

- **Run unit tests:** `pnpm test` (or filter a single package: `pnpm --filter @use-botify/router test`)
- **Typecheck all workspaces:** `pnpm script:check:all`
- **Build a specific package:** `pnpm --filter @use-botify/core build`
- **Preview docs & website:** `pnpm dev:web`

## Code Quality Checklist

Before opening a pull request, make sure every check passes cleanly from the repository root:

```bash
pnpm check:fix
pnpm script:check:all
pnpm test
```

If your changes touch `apps/web` or `/docs`, also verify the production Next.js build:

```bash
pnpm --filter web build
```

## Commit & Pull Request Guidelines

- Follow **Conventional Commits** (`feat(router): ...`, `fix(cli): ...`, `docs(web): ...`, `chore: ...`).
- Keep PRs focused on a single feature, bug fix, or documentation update.
- Add or update Vitest unit tests when changing package runtime behavior or CLI templates.
- Never commit `.env` files, bot tokens, or personal credentials.

## Questions & Issues

Open an issue on [GitHub](https://github.com/use-botify/use-botify-starter/issues) to discuss larger architectural changes before writing a big PR.
