import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/configs/env.config";
import { PrismaClient } from "@/generated/client";

const adapter = new PrismaPg({
	connectionString: env.DATABASE_URL,
	max: env.DB_POOL_MAX,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 5_000,
});
const db = new PrismaClient({ adapter });

export { db };
