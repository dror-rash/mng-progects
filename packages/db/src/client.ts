import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { buildPoolConfig } from "./pool-config";
import * as schema from "./schema";

let db: NodePgDatabase<typeof schema> | undefined;

/** Lazy: nothing connects (or reads env) until first use, so `next build` works without a database. */
export function getDb() {
  db ??= drizzle(new Pool(buildPoolConfig(process.env)), { schema });
  return db;
}
