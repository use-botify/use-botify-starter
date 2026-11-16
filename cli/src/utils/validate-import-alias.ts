import { z } from "zod";

export const DEFAULT_IMPORT_ALIAS = "@/*";

/**
 * Valid alias pattern like `@/*`, `~/*`, `#/*`, or `@app/*`.
 * Must not start with `.` or `/` (to avoid colliding with relative/absolute paths)
 * and must end with `/*`.
 */
const IMPORT_ALIAS_REGEX = /^[^./\s][^/\s]*\/\*$/;

export const importAliasSchema = z
	.string()
	.trim()
	.min(3, "Import alias must be at least 3 characters (e.g. @/*).")
	.refine((val) => !val.startsWith(".") && !val.startsWith("/"), {
		message: "Import alias cannot start with '.' or '/'.",
	})
	.refine((val) => val.endsWith("/*"), {
		message: "Import alias must end with '/*' (e.g. @/* or ~/*).",
	})
	.refine((val) => IMPORT_ALIAS_REGEX.test(val), {
		message:
			"Import alias must be a single prefix followed by '/*' (e.g. @/*, ~/*, #/*).",
	});

export type ResolvedImportAlias = {
	/** Full tsconfig pattern, e.g. "@/*" */
	pattern: string;
	/** Bare alias key for vitest.config.ts, e.g. "@" */
	key: string;
	/** Import prefix used in source files, e.g. "@/" */
	prefix: string;
};

export function validateImportAlias(rawInput: string): string | undefined {
	const trimmed = rawInput.trim();
	const parsed = importAliasSchema.safeParse(trimmed);

	if (!parsed.success) {
		return parsed.error.issues[0]?.message ?? "Invalid import alias.";
	}

	return undefined;
}

export function resolveImportAlias(rawInput: string): ResolvedImportAlias {
	const pattern = rawInput.trim() || DEFAULT_IMPORT_ALIAS;
	const key = pattern.slice(0, -2);
	const prefix = `${key}/`;

	return {
		pattern,
		key,
		prefix,
	};
}