import { PrismaClient } from "@prisma/client";

// In development, Next.js hot-reloads modules on every save. Without this,
// each reload would create a NEW PrismaClient and a new pool of DB
// connections until Postgres runs out. We stash one instance on globalThis
// so reloads reuse it.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
