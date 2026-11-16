import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { runCliPrompts } from "./prompts";

export async function scaffoldProject() {
  const config = await runCliPrompts();
  const targetDir = path.resolve(process.cwd(), config.projectName);

  console.log(`\nCreating a new Botify app in ${chalk.green(targetDir)}\n`);
  console.log("Using pnpm.\nInitializing project with template:-\n");

  const dependencies: Record<string, string> = {
    grammy: "^1.30.0",
    dotenv: "^16.4.5",
  };

  const devDependencies: Record<string, string> = {
    typescript: "^5.6.0",
    tsx: "^4.19.0",
  };

  // Inject @botify/icons when selected
  if (config.icons) {
    dependencies["@botify/icons"] = "^1.0.0";
  }

  if (config.prisma) {
    dependencies["@prisma/client"] = "^5.20.0";
    devDependencies["prisma"] = "^5.20.0";
  }

  // Inject Linter (ESLint + Prettier or Biome)
  if (config.linter === "eslint") {
    devDependencies["eslint"] = "^9.0.0";
    devDependencies["prettier"] = "^3.3.0";
    devDependencies["eslint-config-prettier"] = "^9.1.0";
  } else {
    devDependencies["@biomejs/biome"] = "^1.9.0";
  }

  // Inject Repomix for AI Context
  if (config.repomix) {
    devDependencies["repomix"] = "^0.2.0";
  }

  if (config.vitest) {
    devDependencies["vitest"] = "^2.1.0";
  }

  console.log("Installing dependencies:", Object.keys(dependencies).join(", "));
  console.log("Installing devDependencies:", Object.keys(devDependencies).join(", "));

  await fs.ensureDir(targetDir);
  await fs.writeJson(
    path.join(targetDir, "package.json"),
    {
      name: path.basename(targetDir),
      version: "0.1.0",
      private: true,
      dependencies,
      devDependencies,
    },
    { spaces: 2 }
  );

  console.log(chalk.green("\nHey your project created successfully"));
  console.log(`- Visit the docs: ${chalk.cyan("https://botify.axisbuddy.com/docs")}`);
  console.log(`- Also visit GitHub: ${chalk.cyan("https://github.com/sahilkumardev/use-botify")}`);
  console.log(`- Created by ${chalk.bold("sahilkumardev")} and powered by ${chalk.bold("axisbuddy")}\n`);
}