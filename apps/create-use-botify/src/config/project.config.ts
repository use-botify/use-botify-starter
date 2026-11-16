import type { Answers } from "@/schema/answers.schema"

export const links = {
  docs: "https://botify.axisbuddy.com/docs",
  github: "https://github.com/sahilkumardev/use-botify",
}

type Rule = {
  when: (answers: Answers) => boolean
  dependencies?: string[]
  devDependencies?: string[]
  // pnpm 11+ fails the install when a package runs a build script nobody approved.
  allowBuilds?: string[]
}

// Specs go straight to `pnpm add`, so a bare name installs the latest release.
// A range is pinned only where the latest release is known to break something.
const rules: Rule[] = [
  {
    when: () => true,
    dependencies: ["grammy", "@grammyjs/runner", "@grammyjs/auto-retry", "zod"],
  },
  {
    when: (a) => a.runtime === "node",
    devDependencies: ["tsx", "@types/node@24"],
    allowBuilds: ["esbuild"],
  },
  // typescript-eslint supports TypeScript below 6.1 only (TypeScript 7 dropped
  // the JS API it relies on), so ESLint projects stay on 6.0.
  {
    when: (a) => a.linter === "eslint",
    devDependencies: [
      "typescript@~6.0",
      "eslint",
      "@eslint/js",
      "typescript-eslint",
      "eslint-config-prettier",
      "globals",
      "prettier",
      "@ianvs/prettier-plugin-sort-imports",
    ],
  },
  {
    when: (a) => a.linter === "biome",
    devDependencies: ["typescript", "@biomejs/biome"],
  },
  // Prisma 8 is still a release candidate, so stay on the stable 7 line.
  {
    when: (a) => a.prisma,
    dependencies: ["@prisma/client@7", "@prisma/adapter-pg@7", "pg"],
    devDependencies: ["prisma@7", "@types/pg"],
    allowBuilds: ["prisma", "@prisma/engines"],
  },
  { when: (a) => a.vitest, devDependencies: ["vitest"] },
  { when: (a) => a.repomix, devDependencies: ["repomix"] },
  { when: (a) => a.icons, dependencies: ["@botify/icons"] },
]

export function resolveDependencies(answers: Answers) {
  const matched = rules.filter((rule) => rule.when(answers))
  return {
    dependencies: matched.flatMap((rule) => rule.dependencies ?? []),
    devDependencies: matched.flatMap((rule) => rule.devDependencies ?? []),
    allowBuilds: [...new Set(matched.flatMap((rule) => rule.allowBuilds ?? []))],
  }
}

export function resolveScripts(answers: Answers) {
  const entry = `${answers.srcDir ? "src/" : ""}main.ts`

  // No dist folder: the runtime executes the TypeScript source directly.
  const scripts: Record<string, string> =
    answers.runtime === "node"
      ? {
          dev: `tsx watch --env-file=.env ${entry}`,
          start: `tsx --env-file=.env ${entry}`,
          typecheck: "tsc --noEmit",
        }
      : {
          dev: `deno run --watch --allow-all --env-file=.env ${entry}`,
          start: `deno run --allow-all --env-file=.env ${entry}`,
          typecheck: `deno check ${entry}`,
        }

  if (answers.linter === "biome") {
    Object.assign(scripts, {
      lint: "biome check .",
      "lint:fix": "biome check --write .",
      format: "biome format --write .",
    })
  } else {
    Object.assign(scripts, {
      lint: "eslint .",
      "lint:fix": "eslint . --fix",
      format: "prettier --write .",
      "format:check": "prettier --check .",
    })
  }

  if (answers.vitest) {
    Object.assign(scripts, { test: "vitest run", "test:watch": "vitest" })
  }
  if (answers.repomix) scripts["docs:generate"] = "repomix"
  if (answers.prisma) {
    Object.assign(scripts, {
      "db:generate": "prisma generate",
      "db:migrate": "prisma migrate dev",
      "db:studio": "prisma studio",
    })
  }

  return scripts
}
