import { config as loadEnv } from "dotenv";
import { sql } from "drizzle-orm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createDb, requestEventsTable, requestOperationsTable } from "@repo/db";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(scriptDirectory, "../../../../.env") });

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;

  if (!user || !password || !database) {
    return null;
  }

  const host = process.env.POSTGRES_HOST ?? process.env.PGHOST ?? "localhost";
  const port = process.env.POSTGRES_PORT ?? process.env.PGPORT ?? "5432";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

async function countViolations() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Missing database configuration. Set DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB.",
    );
  }

  const db = createDb(databaseUrl);

  const [eventsXorViolation] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(requestEventsTable).where(sql`
      NOT (
        (${requestEventsTable.mintRequestId} IS NOT NULL AND ${requestEventsTable.redeemRequestId} IS NULL)
        OR
        (${requestEventsTable.mintRequestId} IS NULL AND ${requestEventsTable.redeemRequestId} IS NOT NULL)
      )
    `);

  const [eventsTypeMismatchViolation] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(requestEventsTable).where(sql`
      NOT (
        (${requestEventsTable.requestType} = 'mint' AND ${requestEventsTable.mintRequestId} IS NOT NULL AND ${requestEventsTable.redeemRequestId} IS NULL)
        OR
        (${requestEventsTable.requestType} = 'redeem' AND ${requestEventsTable.redeemRequestId} IS NOT NULL AND ${requestEventsTable.mintRequestId} IS NULL)
      )
    `);

  const [opsXorViolation] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(requestOperationsTable).where(sql`
      NOT (
        (${requestOperationsTable.mintRequestId} IS NOT NULL AND ${requestOperationsTable.redeemRequestId} IS NULL)
        OR
        (${requestOperationsTable.mintRequestId} IS NULL AND ${requestOperationsTable.redeemRequestId} IS NOT NULL)
      )
    `);

  const [opsTypeMismatchViolation] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(requestOperationsTable).where(sql`
      NOT (
        (${requestOperationsTable.requestType} = 'mint' AND ${requestOperationsTable.mintRequestId} IS NOT NULL AND ${requestOperationsTable.redeemRequestId} IS NULL)
        OR
        (${requestOperationsTable.requestType} = 'redeem' AND ${requestOperationsTable.redeemRequestId} IS NOT NULL AND ${requestOperationsTable.mintRequestId} IS NULL)
      )
    `);

  const result = {
    requestEventsXorViolation: Number(eventsXorViolation?.count ?? 0),
    requestEventsTypeMismatchViolation: Number(
      eventsTypeMismatchViolation?.count ?? 0,
    ),
    requestOperationsXorViolation: Number(opsXorViolation?.count ?? 0),
    requestOperationsTypeMismatchViolation: Number(
      opsTypeMismatchViolation?.count ?? 0,
    ),
  };

  return result;
}

async function main() {
  const result = await countViolations();
  const totalViolations = Object.values(result).reduce(
    (sum, count) => sum + count,
    0,
  );

  console.log("Dashboard request integrity preflight:");
  console.table(result);

  if (totalViolations > 0) {
    throw new Error(
      `Preflight failed with ${totalViolations} invalid row(s). Fix data before running migration.`,
    );
  }

  console.log("Preflight passed. No integrity violations found.");
}

void main().catch((error) => {
  console.error("Dashboard integrity preflight failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
