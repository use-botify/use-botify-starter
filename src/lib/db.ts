import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/client";
import { env } from "@/config/env";

const connectionString = env.DATABASE_URL;

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

export { db };
