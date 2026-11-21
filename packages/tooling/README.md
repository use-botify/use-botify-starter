# @use-botify/tooling

Development HMR, Next.js-style route typegen, and atomic icon registry codegen for the Botify Telegram framework. Install as a `devDependency` so production bot bundles stay lean.

## Features

- **Vite feature HMR** — `startFeatureHmr` watches `src/features/`, invalidates changed feature modules via Vite SSR, and preserves shared core singletons (DB clients, loggers, bot instances) in Node's module graph.
- **Route typegen** — `generateRouteTypes` and `writeRouteTypes` scan `features/` and emit strict TypeScript unions for feature names, access tiers, commands, callback patterns, and `[param]` maps.
- **Atomic icon registry store** — `createIconRegistryStore` and `generateIconRegistryTs` keep JSON and typed TypeScript icon registries in sync without partial writes.

## Installation

```bash
pnpm add -D @use-botify/tooling vite
```
