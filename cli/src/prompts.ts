import process from "node:process";

import { cancel, confirm, isCancel, log, text } from "@clack/prompts";
import chalk from "chalk";

import {
	DEFAULT_IMPORT_ALIAS,
	type ResolvedImportAlias,
	resolveImportAlias,
	validateImportAlias,
} from "@/utils/validate-import-alias";
import {
	type ResolvedProjectTarget,
	resolveProjectTarget,
	validateProjectName,
} from "@/utils/validate-project-name";

const DEFAULT_PROJECT_NAME = "my-botify-app";

export type ScaffoldAnswers = {
	target: ResolvedProjectTarget;
	useSrcDir: boolean;
	importAlias: ResolvedImportAlias;
	includeAdmin: boolean;
	includeDeveloper: boolean;
};

function unwrapPrompt<T>(value: T | symbol): T {
	if (isCancel(value)) {
		cancel("Operation cancelled.");
		process.exit(0);
	}
	return value;
}

export async function runCliPrompts(
	argProjectName?: string,
): Promise<ScaffoldAnswers> {
	let selectedName: string | undefined;

	// Question 1: Project Name (CLI arg or interactive prompt)
	if (argProjectName) {
		const validationError = validateProjectName(argProjectName);
		if (validationError) {
			log.error(chalk.red(validationError));
		} else {
			selectedName = argProjectName;
			log.step(`Using project name: ${chalk.cyan(argProjectName)}`);
		}
	}

	if (!selectedName) {
		const nameResponse = unwrapPrompt(
			await text({
				message: "What is your project named?",
				placeholder: DEFAULT_PROJECT_NAME,
				defaultValue: DEFAULT_PROJECT_NAME,
				validate(value) {
					const input = value.trim() || DEFAULT_PROJECT_NAME;
					return validateProjectName(input);
				},
			}),
		);

		selectedName = nameResponse.trim() || DEFAULT_PROJECT_NAME;
	}

	const target = resolveProjectTarget(selectedName);

	// Question 2: Want `src/` directory or not?
	const useSrcDir = unwrapPrompt(
		await confirm({
			message: `Would you like your code inside a ${chalk.cyan("`src/`")} directory?`,
			initialValue: true,
		}),
	);

	// Question 3: Import alias (@/* default or custom)
	const customizeAlias = unwrapPrompt(
		await confirm({
			message: `Would you like to customize the default import alias (${chalk.cyan(DEFAULT_IMPORT_ALIAS)})?`,
			initialValue: false,
		}),
	);

	let aliasInput = DEFAULT_IMPORT_ALIAS;

	if (customizeAlias) {
		const customAliasResponse = unwrapPrompt(
			await text({
				message: "What import alias would you like configured?",
				placeholder: DEFAULT_IMPORT_ALIAS,
				defaultValue: DEFAULT_IMPORT_ALIAS,
				validate(value) {
					const input = value.trim() || DEFAULT_IMPORT_ALIAS;
					return validateImportAlias(input);
				},
			}),
		);

		aliasInput = customAliasResponse.trim() || DEFAULT_IMPORT_ALIAS;
	}

	const importAlias = resolveImportAlias(aliasInput);

	// Question 4: Want admin feature?
	const includeAdmin = unwrapPrompt(
		await confirm({
			message: `Would you like to include the ${chalk.cyan("Admin")} feature (${chalk.dim("/panel")})?`,
			initialValue: true,
		}),
	);

	// Question 5: Want developer feature?
	const includeDeveloper = unwrapPrompt(
		await confirm({
			message: `Would you like to include the ${chalk.cyan("Developer")} feature (${chalk.dim("/devtools & icon manager")})?`,
			initialValue: true,
		}),
	);

	return {
		target,
		useSrcDir,
		importAlias,
		includeAdmin,
		includeDeveloper,
	};
}