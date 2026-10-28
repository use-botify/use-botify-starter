import type { Stats } from "node:fs";
import { lstat, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import { logger } from "@/lib/logger";

const LOGGER_CONTEXT = "CleanModules";
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 300;

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function getErrorCode(error: unknown): string | undefined {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof error.code === "string"
	) {
		return error.code;
	}

	return undefined;
}

async function cleanModules(): Promise<void> {
	const projectRoot = process.cwd();
	const packageJsonPath = resolve(projectRoot, "package.json");
	const modulesPath = resolve(projectRoot, "node_modules");

	logger.info(LOGGER_CONTEXT, `Starting dependency cleanup in: ${projectRoot}`);

	try {
		const packageJson = await readFile(packageJsonPath, "utf8");
		const metadata: unknown = JSON.parse(packageJson);

		if (
			typeof metadata !== "object" ||
			metadata === null ||
			Array.isArray(metadata)
		) {
			throw new Error("package.json must contain a JSON object.");
		}
	} catch (error: unknown) {
		throw new Error(
			`Project root validation failed: ${getErrorMessage(error)}`,
		);
	}

	let modulesStats: Stats;

	try {
		modulesStats = await lstat(modulesPath);
	} catch (error: unknown) {
		if (getErrorCode(error) === "ENOENT") {
			logger.info(
				LOGGER_CONTEXT,
				"node_modules does not exist. Nothing to clean.",
			);
			return;
		}

		throw new Error(
			`Unable to inspect node_modules: ${getErrorMessage(error)}`,
		);
	}

	if (modulesStats.isSymbolicLink() || !modulesStats.isDirectory()) {
		throw new Error(
			"Refusing to remove node_modules because it is not a regular directory.",
		);
	}

	logger.warn(LOGGER_CONTEXT, `Removing dependency directory: ${modulesPath}`);

	try {
		await rm(modulesPath, {
			recursive: true,
			force: true,
			maxRetries: MAX_RETRIES,
			retryDelay: RETRY_DELAY_MS,
		});
	} catch (error: unknown) {
		throw new Error(`Failed to remove node_modules: ${getErrorMessage(error)}`);
	}

	try {
		await lstat(modulesPath);

		throw new Error("Cleanup verification failed: node_modules still exists.");
	} catch (error: unknown) {
		if (getErrorCode(error) !== "ENOENT") {
			throw error;
		}
	}

	logger.info(LOGGER_CONTEXT, "Successfully removed node_modules.");
}

cleanModules().catch((error: unknown) => {
	logger.error(LOGGER_CONTEXT, `Cleanup failed: ${getErrorMessage(error)}`);

	if (error instanceof Error && error.stack) {
		logger.debug(LOGGER_CONTEXT, error.stack);
	}

	process.exitCode = 1;
});
