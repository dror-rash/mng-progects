import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { buildPoolConfig } from "./pool-config";
import * as schema from "./schema";

let db: NodePgDatabase<typeof schema> | undefined;

/**
 * A pool as the login user (the owner), which row-level security doesn't apply to (ADR-0006). For
 * seeds, e2e fixtures and database tests only: app code may not import it (lint rule).
 */
export function getMaintenanceDb() {
  db ??= drizzle(new Pool(buildPoolConfig(process.env, null)), { schema });
  return db;
}
