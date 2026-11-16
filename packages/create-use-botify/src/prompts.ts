import * as p from "@clack/prompts";
import chalk from "chalk";

export async function runCliPrompts() {
  p.intro(chalk.bgCyan(chalk.black(" create-use-botify v1.0.0 ")));

  const answers = await p.group(
    {
      projectName: () =>
        p.text({
          message: "What is your project named?",
          placeholder: "my-botify-app (or ./ for root)",
          defaultValue: "my-botify-app",
        }),
      architecture: () =>
        p.select({
          message: "How would you like to structure your project?",
          options: [
            { value: "standalone", label: "Standalone (Base single project)" },
            { value: "monorepo", label: "Monorepo (Turboworkspace / packages)" },
          ],
          initialValue: "standalone",
        }),
      typescript: () =>
        p.confirm({
          message: "This project uses TypeScript, would you like to continue?",
          initialValue: true,
        }),
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
          initialValue: "eslint",
        }),
      prisma: () =>
        p.confirm({
          message: "This project uses SQL database `prisma`, would you like to continue?",
          initialValue: true,
        }),
      adminFeatures: () =>
        p.confirm({
          message: "Would you like to include admin features?",
          initialValue: true,
        }),
      developerFeatures: () =>
        p.confirm({
          message: "Would you like to include developer features?",
          initialValue: true,
        }),
      srcDir: () =>
        p.confirm({
          message: "Would you like your code inside a `src/` directory?",
          initialValue: true,
        }),
      vitest: () =>
        p.confirm({
          message: "Would you like to use `vitest` test with it?",
          initialValue: false,
        }),
      repomix: () =>
        p.confirm({
          message: "Would you like to use `repomix` for context to the `ai`?",
          initialValue: true,
        }),
      icons: () =>
        p.confirm({
          message: "Would you like to use icon library (`@botify/icons`) with it?",
          initialValue: true,
        }),
      docker: () =>
        p.confirm({
          message: "Would you like to use docker? (recommended)",
          initialValue: true,
        }),
      customizeAlias: () =>
        p.confirm({
          message: "Would you like to customize the import alias (`@/*` by default)?",
          initialValue: false,
        }),
      importAlias: ({ results }) => {
        if (!results.customizeAlias) return Promise.resolve("@/*");
        return p.text({
          message: "Enter your custom import alias:",
          placeholder: "@/*",
          defaultValue: "@/*",
        });
      },
    },
    {
      onCancel: () => {
        p.cancel("Setup cancelled.");
        process.exit(0);
      },
    }
  );

  return answers;
}