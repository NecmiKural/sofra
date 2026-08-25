/**
 * Sofra data layer — Prisma 6 on SQLite.
 * The schema lives in `prisma/schema.prisma`; migrations are applied with
 * `npm run db:migrate` (dev) or `npx prisma migrate deploy` (production).
 *
 * A single client is cached on `globalThis` so Next.js hot-reload in dev does
 * not open a new connection pool on every module reload.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { sofraPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.sofraPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.sofraPrisma = prisma;
