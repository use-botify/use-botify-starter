import { z } from "zod";
import * as dotenv from "dotenv";
import { logger } from "@/lib/logger";

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error(
    "EnvValidation",
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
