import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/configs/env.config";
import { PrismaClient } from "@/generated/client";

const adapter = new PrismaPg({
	connectionString: env.DATABASE_URL,
	max: 10,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 5_000,
});
const db = new PrismaClient({ adapter });

export { db };
