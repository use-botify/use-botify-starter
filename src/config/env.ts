import { z } from "zod";
import * as dotenv from "dotenv";
import { logger } from "@/lib/logger";

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.url({ error: "TELEGRAM_BOT_TOKEN is required" }),
  DATABASE_URL: z.url({ error: "Valid DATABASE_URL is required" }),
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
