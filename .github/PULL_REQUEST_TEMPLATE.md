## Summary

<!-- Describe what this PR changes and why. Link related issues with `Closes #123`. -->

## Affected Packages

- [ ] `create-use-botify`
- [ ] `@use-botify/core`
- [ ] `@use-botify/router`
- [ ] `@use-botify/tooling`
- [ ] `@use-botify/plugins`
- [ ] `@use-botify/icons`
- [ ] `apps/web` (landing page / docs)
- [ ] Workspace / tooling / CI

## Verification Checklist

- [ ] `pnpm check` passes with zero Biome errors
- [ ] `pnpm script:check:all` passes across all workspace packages
- [ ] `pnpm test` passes (and new unit tests were added where applicable)
- [ ] `pnpm --filter web build` passes (if `apps/web` or `/docs` was modified)
