import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema/index";

export type Database = NodePgDatabase<typeof schema>;
export type DatabaseClient = Database & { $client: Pool };

export function createDb(
  connectionString: string,
  poolConfig: PoolConfig = {},
): DatabaseClient {
  const pool = new Pool({
    connectionString,
    ...poolConfig,
  });

  return drizzle(pool, { schema });
}
