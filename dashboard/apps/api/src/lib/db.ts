import { createDb } from "@repo/db";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

const maxConnections = Number(process.env.PGBOUNCER_POOL_MAX ?? 20);

export const db = createDb(databaseUrl, {
  max: Number.isFinite(maxConnections) ? maxConnections : 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
