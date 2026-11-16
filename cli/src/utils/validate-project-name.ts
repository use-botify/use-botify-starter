import { existsSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

import { z } from "zod";

const RESERVED_NAMES = new Set([
	"node_modules",
	"favicon.ico",
	"use-botify-app",
	"grammy",
	"prisma",
]);

/**
 * Matches valid npm package names:
 * - Lowercase letters, digits, hyphens, underscores, or periods
 * - Must start with a lowercase letter or digit
 * - Max 214 characters
 */
const NPM_NAME_REGEX = /^[a-z0-9][a-z0-9._-]*$/;

export const projectNameSchema = z
	.string()
	.trim()
	.min(1, "Project name cannot be empty.")
	.max(214, "Project name must be 214 characters or fewer.")
	.refine((val) => val === "." || !/[A-Z]/.test(val), {
		message: "Project name cannot contain uppercase letters.",
	})
	.refine((val) => val === "." || !/\s/.test(val), {
		message: "Project name cannot contain spaces.",
	})
	.refine((val) => val === "." || NPM_NAME_REGEX.test(val), {
		message:
			"Project name must start with a lowercase letter or number and contain only lowercase letters, numbers, hyphens, underscores, or dots.",
	})
	.refine(
		(val) => {
			const effectiveName =
				val === "." ? basename(resolve(process.cwd())) : val;
			return !RESERVED_NAMES.has(effectiveName.toLowerCase());
		},
		{
			message: "Project name cannot be a reserved package or system name.",
		},
	);

export type ResolvedProjectTarget = {
	projectName: string;
	targetDir: string;
	isCurrentDir: boolean;
};

export function validateProjectName(rawInput: string): string | undefined {
	const trimmed = rawInput.trim();

	if (trimmed === ".") {
		const currentFolderName = basename(resolve(process.cwd()));
		const currentCheck = projectNameSchema.safeParse(currentFolderName);
		if (!currentCheck.success) {
			return `Current directory name "${currentFolderName}" is invalid: ${currentCheck.error.issues[0]?.message}`;
		}
	} else {
		const parsed = projectNameSchema.safeParse(trimmed);
		if (!parsed.success) {
			return parsed.error.issues[0]?.message ?? "Invalid project name.";
		}
	}

	const targetDir = resolve(process.cwd(), trimmed);

	if (existsSync(targetDir)) {
		const existingFiles = readdirSync(targetDir).filter(
			(file) => file !== ".git" && file !== ".DS_Store",
		);
		if (existingFiles.length > 0) {
			return trimmed === "."
				? "Current directory is not empty. Choose a new folder name or empty this directory."
				: `Directory "${trimmed}" already exists and is not empty.`;
		}
	}

	return undefined;
}

export function resolveProjectTarget(rawInput: string): ResolvedProjectTarget {
	const trimmed = rawInput.trim();
	const isCurrentDir = trimmed === ".";
	const targetDir = resolve(process.cwd(), trimmed);
	const projectName = isCurrentDir ? basename(targetDir) : trimmed;

	return {
		projectName,
		targetDir,
		isCurrentDir,
	};
}