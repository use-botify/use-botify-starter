import { z } from "zod"

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required")
  .refine(
    (value) => value === "./" || /^[a-z0-9][a-z0-9._~-]*$/.test(value),
    "Use lowercase letters, numbers, - . _ ~ (or ./ for the current folder)"
  )

export const importAliasSchema = z
  .string()
  .trim()
  .regex(/^[@~#][\w-]*\/\*$/, "Use a pattern like @/*, ~/* or #/*")

export const answersSchema = z.object({
  projectName: projectNameSchema,
  typescript: z.literal(true),
  runtime: z.enum(["node", "deno"]),
  linter: z.enum(["biome", "eslint"]),
  prisma: z.boolean(),
  adminFeatures: z.boolean(),
  developerFeatures: z.boolean(),
  srcDir: z.boolean(),
  vitest: z.boolean(),
  repomix: z.boolean(),
  icons: z.boolean(),
  docker: z.boolean(),
  importAlias: importAliasSchema,
})

export type Answers = z.infer<typeof answersSchema>
