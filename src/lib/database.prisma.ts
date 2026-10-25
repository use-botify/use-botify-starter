import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/configs/env.config";
import { PrismaClient } from "@/generated/client";

const connectionString = env.DATABASE_URL;

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

export { db };
