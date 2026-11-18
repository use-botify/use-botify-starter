import process from "node:process";

import spawn from "cross-spawn";

import { logger } from "@/lib/logger";

type Step = {
	name: string;
	command: string;
	args: string[];
};

const steps: Step[] = [
	{
		name: "Lint and format check (with auto-fix)",
		command: "pnpm",
		args: ["exec", "biome", "check", "--write", "."],
	},
	{
		name: "TypeScript typecheck",
		command: "pnpm",
		args: ["exec", "tsc", "--noEmit"],
	},
	{
		name: "Vitest test suite",
		command: "pnpm",
		args: ["exec", "vitest", "run", "--passWithNoTests"],
	},
];

const main = (): void => {
	let hasErrors = false;
	let passed = 0;
	let failed = 0;

	logger.info("CheckAndFix", "Starting code quality checks.", {
		totalSteps: steps.length,
	});

	for (const [index, step] of steps.entries()) {
		logger.info(
			"CheckAndFix",
			`Step ${index + 1}/${steps.length}: ${step.name}`,
		);

		try {
			const result = spawn.sync(step.command, step.args, {
				stdio: "inherit",
			});

			if (result.error) {
				logger.error(
					"CheckAndFix",
					`Failed to execute: ${step.name}`,
					result.error,
				);

				hasErrors = true;
				failed++;
				continue;
			}

			if (result.status !== 0) {
				logger.error("CheckAndFix", `Step failed: ${step.name}`, {
					exitCode: result.status,
					signal: result.signal,
				});

				hasErrors = true;
				failed++;
				continue;
			}

			passed++;

			logger.info("CheckAndFix", `Step passed: ${step.name}`);
		} catch (error: unknown) {
			logger.error(
				"CheckAndFix",
				`Unexpected error during: ${step.name}`,
				error,
			);

			hasErrors = true;
			failed++;
		}
	}

	logger.info("CheckAndFix", "Code quality check summary.", {
		total: steps.length,
		passed,
		failed,
	});

	if (hasErrors) {
		logger.error(
			"CheckAndFix",
			"Some checks failed. Review the errors and fix remaining issues.",
		);

		process.exitCode = 1;
		return;
	}

	logger.info("CheckAndFix", "All checks passed successfully!");
};

main();
