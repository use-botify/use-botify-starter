import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/configs/env.config";
import { PrismaClient } from "@/generated/client";
import { logger } from "@/lib/logger";

const adapter = new PrismaPg({
	connectionString: env.DATABASE_URL,
	max: env.DB_POOL_MAX,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 5_000,
});

export const db = new PrismaClient({
	adapter,
	log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export async function connectDatabase(): Promise<void> {
	await db.$connect();
	logger.info("Database", "Connected successfully");
}

export async function disconnectDatabase(): Promise<void> {
	await db.$disconnect();
	logger.info("Database", "Disconnected successfully");
}
