#!/usr/bin/env node
import process from "node:process";

import { intro, note, outro, spinner } from "@clack/prompts";
import chalk from "chalk";

import { runCliPrompts } from "./prompts";
import { scaffoldProject } from "./scaffold";

async function main(): Promise<void> {
	console.log();
	intro(chalk.bgCyan.black.bold(" use-botify-app "));

	const argProjectName = process.argv[2]?.trim();
	const answers = await runCliPrompts(argProjectName);

	const s = spinner();
	s.start(
		`Scaffolding ${chalk.cyan(answers.target.projectName)} in ${chalk.dim(answers.target.targetDir)}...`,
	);

	await scaffoldProject(answers);

	s.stop(
		`Created ${chalk.bold.green(answers.target.projectName)} successfully!`,
	);

	const nextSteps = [
		...(answers.target.isCurrentDir
			? []
			: [`cd ${answers.target.projectName}`]),
		"cp .env.example .env",
		"pnpm install",
		"pnpm db:generate",
		"pnpm dev",
	];

	note(nextSteps.join("\n"), "Next steps");

	outro(chalk.green("Happy bot building with Botify!"));
}

main().catch((error: unknown) => {
	console.error(
		chalk.red("Failed to scaffold Botify project:"),
		error instanceof Error ? error.message : String(error),
	);
	process.exit(1);
});