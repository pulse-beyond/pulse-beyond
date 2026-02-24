import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

async function createPrismaClient(): Promise<PrismaClient> {
  const url = process.env.DATABASE_URL ?? "";

  // Use Neon serverless adapter when connecting to PostgreSQL (production)
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    const { PrismaNeon } = await import("@prisma/adapter-neon");
    const { Pool } = await import("@neondatabase/serverless");
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaNeon(pool);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  }

  // Local dev with SQLite: standard Prisma client
  return new PrismaClient();
}

function getPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";

  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    const { PrismaNeon } = require("@prisma/adapter-neon");
    const { Pool } = require("@neondatabase/serverless");
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaNeon(pool);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
