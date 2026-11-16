import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ScaffoldAnswers } from "@/prompts";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the template root.
 * In development inside the repo, the root starter is two levels up from `cli/src` (or `cli/dist`).
 */
const TEMPLATE_ROOT = resolve(__dirname, "../..");

const EXCLUDED_ROOT_ENTRIES = new Set([
	"cli",
	"web",
	"node_modules",
	".git",
	"dist",
	"coverage",
	"context",
	".env",
	"pnpm-lock.yaml",
	"pnpm-workspace.yaml",
]);

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFeaturesIndexContent(
	aliasPrefix: string,
	includeAdmin: boolean,
	includeDeveloper: boolean,
): string {
	const imports: string[] = [`import type { Feature } from "${aliasPrefix}core";`];
	const items: string[] = ["\tpublicFeature,"];

	if (includeAdmin) {
		imports.push(
			`import { adminFeature } from "${aliasPrefix}features/admin/admin.feature";`,
		);
		items.push("\tadminFeature,");
	}

	if (includeDeveloper) {
		imports.push(
			`import { developerFeature } from "${aliasPrefix}features/developer/developer.feature";`,
		);
		items.push("\tdeveloperFeature,");
	}

	imports.push(
		`import { publicFeature } from "${aliasPrefix}features/public/public.feature";`,
	);

	return [
		...imports,
		"",
		"export const features: readonly Feature[] = [",
		...items,
		"];",
		"",
	].join("\n");
}

function buildPublicStartCommandContent(
	aliasPrefix: string,
	includeAdmin: boolean,
	includeDeveloper: boolean,
): string {
	const accessImports: string[] = [];
	if (includeAdmin) accessImports.push("\tisUserAdmin,");
	if (includeDeveloper) accessImports.push("\tisUserDeveloper,");

	const lines: string[] = [
		'import { InlineKeyboard } from "grammy";',
		'import type { User } from "grammy/types";',
		"",
		"import {",
		"\tCONTACT_CHANNEL_URL,",
		"\tTERMS_AND_CONDITION,",
		`} from "${aliasPrefix}configs/constant.config";`,
		`import type { BotCommandContext } from "${aliasPrefix}core";`,
	];

	if (includeDeveloper) {
		lines.push(
			`import { DEVELOPER_ROUTES } from "${aliasPrefix}features/developer/developer.route";`,
		);
	}

	lines.push(
		`import { iconCallbackButton, iconUrlButton } from "${aliasPrefix}lib/icons";`,
	);

	if (accessImports.length > 0) {
		lines.push(
			"import {",
			...accessImports,
			`} from "${aliasPrefix}middlewares/access-guard.middleware";`,
		);
	}

	lines.push(
		`import { upsertUserProfile } from "${aliasPrefix}services/user.service";`,
		`import { formatUserMention } from "${aliasPrefix}utils/format-user-mention";`,
		"",
		"export async function publicStartCommand(",
		"\tctx: BotCommandContext,",
		"): Promise<void> {",
		"\tconst user = ctx.from;",
		"\tif (!user) return;",
		"",
		"\tawait upsertUserProfile(user);",
		"",
		"\tawait ctx.reply(buildStartText(user), {",
		`\t\treply_markup: buildStartKeyboard(${includeAdmin || includeDeveloper ? "user.id" : "_userId"}),`,
		'\t\tparse_mode: "HTML",',
		"\t});",
		"}",
		"",
		"export function buildStartText(",
		'\tuser?: Pick<User, "username" | "first_name">,',
		"): string {",
		"\treturn [",
		"\t\t`Hey user, <b>${formatUserMention(user)}</b>`,",
		'\t\t"Welcome to <b>Botify Booster</b> - boost your Telegram channels and groups quickly and reliably.",',
		'\t\t`<i>Using this bot you agree our <a href="${TERMS_AND_CONDITION}">Terms and condition</a> of Service</i>`,',
		'\t].join("\\n\\n");',
		"}",
		"",
		`export function buildStartKeyboard(${includeAdmin || includeDeveloper ? "userId: number" : "_userId?: number"}): InlineKeyboard {`,
		"\tconst keyboard = new InlineKeyboard()",
		'\t\t.add(iconCallbackButton("buy", "Buy Boost"))',
		"\t\t.row()",
		'\t\t.add(iconUrlButton("chat", "Contact", CONTACT_CHANNEL_URL))',
		'\t\t.add(iconCallbackButton("flash", "Orders"));',
	);

	if (includeAdmin && includeDeveloper) {
		lines.push(
			"",
			"\tif (isUserAdmin(userId) && !isUserDeveloper(userId)) {",
			'\t\tkeyboard.row().add(iconCallbackButton("shield", "Admin Panel"));',
			"\t}",
		);
	} else if (includeAdmin) {
		lines.push(
			"",
			"\tif (isUserAdmin(userId)) {",
			'\t\tkeyboard.row().add(iconCallbackButton("shield", "Admin Panel"));',
			"\t}",
		);
	}

	if (includeDeveloper) {
		lines.push(
			"",
			"\tif (isUserDeveloper(userId)) {",
			"\t\tkeyboard",
			"\t\t\t.row()",
			"\t\t\t.add(",
			"\t\t\t\ticonCallbackButton(",
			'\t\t\t\t\t"settings",',
			'\t\t\t\t\t"Devtools",',
			"\t\t\t\t\tDEVELOPER_ROUTES.devtools.build(),",
			"\t\t\t\t),",
			"\t\t\t);",
			"\t}",
		);
	}

	lines.push("", "\treturn keyboard;", "}", "");

	return lines.join("\n");
}

async function collectTypeScriptFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectTypeScriptFiles(fullPath)));
		} else if (entry.isFile() && entry.name.endsWith(".ts")) {
			files.push(fullPath);
		}
	}

	return files;
}

export async function scaffoldProject(answers: ScaffoldAnswers): Promise<void> {
	const { target, useSrcDir, importAlias, includeAdmin, includeDeveloper } =
		answers;
	const destRoot = target.targetDir;
	const codeRoot = useSrcDir ? join(destRoot, "src") : destRoot;

	await mkdir(destRoot, { recursive: true });

	const rootEntries = await readdir(TEMPLATE_ROOT, { withFileTypes: true });

	for (const entry of rootEntries) {
		if (EXCLUDED_ROOT_ENTRIES.has(entry.name)) continue;

		const srcPath = join(TEMPLATE_ROOT, entry.name);

		if (entry.name === "src") {
			await cp(srcPath, codeRoot, {
				recursive: true,
				filter(source) {
					const rel = relative(srcPath, source).replaceAll("\\", "/");
					if (rel === "generated" || rel.startsWith("generated/")) return false;
					if (
						!includeAdmin &&
						(rel === "features/admin" || rel.startsWith("features/admin/"))
					) {
						return false;
					}
					if (
						!includeDeveloper &&
						(rel === "features/developer" ||
							rel.startsWith("features/developer/"))
					) {
						return false;
					}
					return true;
				},
			});
			continue;
		}

		await cp(srcPath, join(destRoot, entry.name), { recursive: true });
	}

	// 1. Update features/index.ts and features/public/start/start.command.ts
	await writeFile(
		join(codeRoot, "features/index.ts"),
		buildFeaturesIndexContent(
			importAlias.prefix,
			includeAdmin,
			includeDeveloper,
		),
		"utf8",
	);

	await writeFile(
		join(codeRoot, "features/public/start/start.command.ts"),
		buildPublicStartCommandContent(
			importAlias.prefix,
			includeAdmin,
			includeDeveloper,
		),
		"utf8",
	);

	// 2. Update package.json
	const pkgPath = join(destRoot, "package.json");
	const pkgRaw = await readFile(pkgPath, "utf8");
	const pkg = JSON.parse(pkgRaw) as Record<string, unknown> & {
		scripts?: Record<string, string>;
	};

	pkg.name = target.projectName;
	if (!useSrcDir && pkg.scripts) {
		pkg.scripts.dev = 'tsx watch --exclude "features/**" main.ts --hmr';
		pkg.scripts.start = "tsx main.ts";
	}
	await writeFile(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`, "utf8");

	// 3. Update tsconfig.json
	const tsconfigPath = join(destRoot, "tsconfig.json");
	const tsconfigRaw = await readFile(tsconfigPath, "utf8");
	const tsconfig = JSON.parse(tsconfigRaw) as {
		compilerOptions: { paths: Record<string, string[]> };
		include: string[];
	};

	tsconfig.compilerOptions.paths = {
		[importAlias.pattern]: [useSrcDir ? "./src/*" : "./*"],
	};

	if (!useSrcDir) {
		tsconfig.include = [
			"configs/**/*",
			"core/**/*",
			"features/**/*",
			"handlers/**/*",
			"lib/**/*",
			"middlewares/**/*",
			"registry/**/*",
			"services/**/*",
			"utils/**/*",
			"main.ts",
			"scripts/**/*",
			"tests/**/*",
			"prisma.config.ts",
			"vitest.config.ts",
		];
	}
	await writeFile(
		tsconfigPath,
		`${JSON.stringify(tsconfig, null, "\t")}\n`,
		"utf8",
	);

	// 4. Update vitest.config.ts
	const vitestPath = join(destRoot, "vitest.config.ts");
	let vitestContent = await readFile(vitestPath, "utf8");
	vitestContent = vitestContent.replace(
		'"@": resolve(import.meta.dirname, "./src")',
		`${JSON.stringify(importAlias.key)}: resolve(import.meta.dirname, ${JSON.stringify(useSrcDir ? "./src" : "./")})`,
	);
	if (!useSrcDir) {
		vitestContent = vitestContent
			.replace(
				'include: ["src/**/*.ts"]',
				'include: ["configs/**/*.ts", "core/**/*.ts", "features/**/*.ts", "handlers/**/*.ts", "lib/**/*.ts", "middlewares/**/*.ts", "registry/**/*.ts", "services/**/*.ts", "utils/**/*.ts"]',
			)
			.replace(
				'exclude: ["src/generated/**", "src/main.ts"]',
				'exclude: ["generated/**", "main.ts"]',
			);
	}
	await writeFile(vitestPath, vitestContent, "utf8");

	// 5. Update prisma/schema.prisma and .gitignore if useSrcDir is false
	if (!useSrcDir) {
		const prismaSchemaPath = join(destRoot, "prisma/schema.prisma");
		const prismaSchema = await readFile(prismaSchemaPath, "utf8");
		await writeFile(
			prismaSchemaPath,
			prismaSchema.replace('output   = "../src/generated"', 'output   = "../generated"'),
			"utf8",
		);

		const gitignorePath = join(destRoot, ".gitignore");
		const gitignore = await readFile(gitignorePath, "utf8");
		await writeFile(
			gitignorePath,
			gitignore.replace("/src/generated", "/generated"),
			"utf8",
		);
	}

	// 6. Update HMR handler and Icon Registry handler paths
	const hmrHandlerPath = join(
		codeRoot,
		"handlers/register-hot-module-replacement.handler.ts",
	);
	let hmrContent = await readFile(hmrHandlerPath, "utf8");
	if (!useSrcDir) {
		hmrContent = hmrContent
			.replace(
				'const sourceRoot = normalizePath(resolve(projectRoot, "src"));',
				"const sourceRoot = normalizePath(projectRoot);",
			)
			.replace(
				'const FEATURES_ENTRY = "/src/features/index.ts";',
				'const FEATURES_ENTRY = "/features/index.ts";',
			);
	}
	if (importAlias.prefix !== "@/") {
		const escapedAliasRegex = `^${escapeRegExp(importAlias.key)}\\/`;
		hmrContent = hmrContent.replace(
			"find: /^@\\//",
			`find: /${escapedAliasRegex}/`,
		);
	}
	await writeFile(hmrHandlerPath, hmrContent, "utf8");

	if (!useSrcDir) {
		const iconHandlerPath = join(
			codeRoot,
			"handlers/register-icons-registry.handler.ts",
		);
		let iconHandlerContent = await readFile(iconHandlerPath, "utf8");
		iconHandlerContent = iconHandlerContent
			.replaceAll("src/registry/icons.registry", "registry/icons.registry")
			.replaceAll(
				"src/handlers/register-icons-registry.handler.ts",
				"handlers/register-icons-registry.handler.ts",
			);
		await writeFile(iconHandlerPath, iconHandlerContent, "utf8");
	}

	// 7. Rewrite import alias across all .ts files if customized
	if (importAlias.prefix !== "@/") {
		const tsFiles = await collectTypeScriptFiles(destRoot);
		for (const filePath of tsFiles) {
			const original = await readFile(filePath, "utf8");
			const updated = original
				.replaceAll('from "@/', `from "${importAlias.prefix}`)
				.replaceAll('import("@/', `import("${importAlias.prefix}`);
			if (updated !== original) {
				await writeFile(filePath, updated, "utf8");
			}
		}
	}
}