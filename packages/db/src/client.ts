import { AsyncLocalStorage } from "node:async_hooks";

import { type ExtractTablesWithRelations, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { Pool } from "pg";

import { buildPoolConfig } from "./pool-config";
import * as schema from "./schema";

/** The pool or a transaction on it: what `getDb()` returns. */
export type Db = PgDatabase<NodePgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

let pool: NodePgDatabase<typeof schema> | undefined;

/** Lazy: nothing connects (or reads env) until first use, so `next build` works without a database. */
function poolDb() {
  pool ??= drizzle(new Pool(buildPoolConfig(process.env)), { schema });
  return pool;
}

/** The active `withAccess` transaction and whose it is. */
const access = new AsyncLocalStorage<{ userId: string; tx: Db }>();

/**
 * Inside `withAccess`, its transaction; otherwise the pool, where row-level security sees no user and
 * every protected table looks empty (fail closed, ADR-0006).
 */
export function getDb(): Db {
  return access.getStore()?.tx ?? poolDb();
}

/**
 * The pool itself, never a `withAccess` transaction. For Better Auth, whose adapter keeps the database
 * it is created with (its tables have no row-level security). Still the runtime role.
 */
export function getPoolDb(): NodePgDatabase<typeof schema> {
  return poolDb();
}

/**
 * Runs `fn` as `userId`: in one short transaction that sets `app.user_id` for the row-level security
 * policies, with `getDb()` returning that transaction. A nested call for the same user reuses it; one
 * for another user throws. Read the session before calling it (so a request never holds two
 * connections) and call `redirect()` after it (it throws, which would roll the transaction back).
 */
export async function withAccess<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const active = access.getStore();
  if (active) {
    if (active.userId !== userId) {
      throw new Error("withAccess: already running as another user");
    }
    return fn();
  }
  return poolDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return access.run({ userId, tx }, fn);
  });
}
