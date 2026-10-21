import * as dotenv from "dotenv";
import { z } from "zod";
import { logger } from "@/lib/logger";

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z
    .string()
    .min(1, { error: "TELEGRAM_BOT_TOKEN is required" }),
  DATABASE_URL: z.url({ error: "Valid DATABASE_URL is required" }),
  ADMIN_ID: z.string().regex(/^\d+$/, {
    error: "ADMIN_ID must be a numeric Telegram user ID (e.g. 1234567890)",
  }),
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
