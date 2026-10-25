import * as dotenv from "dotenv";
import { z } from "zod";

import { logger } from "@/lib/logger";

dotenv.config();

const envSchema = z.object({
	TELEGRAM_BOT_TOKEN: z
		.string()
		.min(1, { error: "TELEGRAM_BOT_TOKEN is required" }),
	DATABASE_URL: z.url({ error: "A valid DATABASE_URL is required" }),
	DEVELOPER_ID: z
		.string()
		.regex(
			/^\d+$/,
			"DEVELOPER_ID must be a numeric Telegram user ID (e.g. 1234567890)",
		)
		.transform(Number),
	ADMIN_IDS: z
		.string()
		.min(1, { error: "At least one ADMIN_ID is required" })
		.transform((val) =>
			val
				.split(",")
				.map((id) => id.trim())
				.filter(Boolean),
		)
		.pipe(
			z
				.array(
					z
						.string()
						.regex(
							/^\d+$/,
							"Each ADMIN_ID must be a numeric Telegram user ID (e.g. 1234567890)",
						)
						.transform(Number),
				)
				.min(1, { error: "ADMIN_IDS must contain at least one valid ID" }),
		)
		.transform((ids) => new Set(ids)),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	logger.error(
		"EnvValidation",
		"Invalid environment variables:",
		z.treeifyError(parsed.error),
	);
	process.exit(1);
}

export const env = parsed.data;
