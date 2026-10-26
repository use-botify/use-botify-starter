# syntax=docker/dockerfile:1

FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

# ---- production dependencies ----
FROM base AS deps
# `postinstall` runs `prisma generate`, so `prisma` must stay in `dependencies`
# (a `--prod` install skips devDependencies). It only needs *a* DATABASE_URL so
# prisma.config.ts can load. Nothing connects at build time.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --prod

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
COPY package.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
USER node
# tsx runs the TypeScript directly (it is a production dependency on purpose).
# Apply pending migrations as a release step, not on every boot:
#   node_modules/.bin/prisma migrate deploy
CMD ["node_modules/.bin/tsx", "src/main.ts"]
