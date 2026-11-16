import { styleText } from "node:util"

import * as p from "@clack/prompts"
import type { z } from "zod"

import {
  answersSchema,
  importAliasSchema,
  projectNameSchema,
  type Answers,
} from "@/schema/answers.schema"

import pkg from "../package.json" with { type: "json" }

const confirm = (message: string, initialValue: boolean) => () =>
  p.confirm({ message, initialValue })

// An empty value means the user accepted the default, so only real input is checked.
const validateWith = (schema: z.ZodType) => (value: string | undefined) => {
  if (!value) return undefined
  const result = schema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

export async function runCliPrompts(): Promise<Answers> {
  p.intro(
    styleText(["bgCyan", "black"], ` create-use-botify v${pkg.version} `)
  )

  const answers = await p.group(
    {
      projectName: () =>
        p.text({
          message: "What is your project named?",
          placeholder: "my-botify-app (or ./ for root)",
          defaultValue: "my-botify-app",
          validate: validateWith(projectNameSchema),
        }),
      typescript: async () => {
        const accepted = await p.confirm({
          message: "This project uses TypeScript, would you like to continue?",
          initialValue: true,
        })
        if (accepted === false) {
          p.cancel("Botify projects are TypeScript only.")
          process.exit(0)
        }
        return accepted
      },
      runtime: () =>
        p.select({
          message: "Which runtime do you want to use?",
          options: [
            { value: "node", label: "node" },
            { value: "deno", label: "deno" },
          ],
          initialValue: "node",
        }),
      linter: () =>
        p.select({
          message: "Which linter would you like to use?",
          options: [
            { value: "biome", label: "biome" },
            { value: "eslint", label: "eslint (with prettier)" },
          ],
          initialValue: "biome",
        }),
      prisma: confirm(
        "This project uses SQL database `prisma`, would you like to continue?",
        true
      ),
      adminFeatures: confirm("Would you like admin features?", true),
      developerFeatures: confirm("Would you like developer features?", true),
      srcDir: confirm("Would you like your code inside a `src/` directory?", true),
      vitest: confirm("Would you like to use `vitest` test with it?", false),
      repomix: confirm(
        "Would you like to use `repomix` for context to the `ai`?",
        true
      ),
      icons: confirm("Would you like to use icon library with it?", true),
      docker: confirm("Would you like to use docker? (recommended)", true),
      customizeAlias: confirm(
        "Would you like to customize the import alias (`@/*` by default)?",
        false
      ),
      importAlias: ({ results }) =>
        results.customizeAlias
          ? p.text({
              message: "Enter your custom import alias:",
              placeholder: "@/*",
              defaultValue: "@/*",
              validate: validateWith(importAliasSchema),
            })
          : Promise.resolve("@/*"),
    },
    {
      onCancel: () => {
        p.cancel("Setup cancelled.")
        process.exit(0)
      },
    }
  )

  return answersSchema.parse(answers)
}
