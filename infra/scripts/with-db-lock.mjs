#!/usr/bin/env node
// Runs a command while holding a Postgres advisory lock (task 068), so two deploys never migrate the same
// database at once (two PRs share app_preview; drizzle-kit migrate takes no lock of its own). The lock is
// session-level, on its own connection from DATABASE_URL, and ends with that connection even if this
// process dies. provision-db-logins.mjs takes the same lock (migrationLockName). Waits for the lock as long as it takes; the deploy job's timeout bounds it.
// Usage: DATABASE_URL=… node --experimental-strip-types infra/scripts/with-db-lock.mjs <lock name> -- <command> [args…]
import { spawn } from "node:child_process";
import { buildPoolConfig } from "../../packages/db/src/pool-config.ts";
import { Client, pinSearchPath, withPinnedSearchPath } from "./pg-safe.mjs";

const [name, separator, command, ...args] = process.argv.slice(2);
if (!name || separator !== "--" || !command) {
  console.error("Usage: with-db-lock.mjs <lock name> -- <command> [args…]");
  process.exit(2);
}

// search_path pinned, calls qualified: the database may hold functions a PR planted (pg-safe.mjs).
const client = new Client(withPinnedSearchPath(buildPoolConfig(process.env, null)));
await client.connect();
await pinSearchPath(client);
// hashtext: a stable 32-bit key per name, in the database's own terms.
await client.query("select pg_catalog.pg_advisory_lock(pg_catalog.hashtext($1::text))", [name]);
const code = await new Promise((resolve) => {
  const child = spawn(command, args, { stdio: "inherit" });
  child.on("error", (error) => (console.error(error.message), resolve(127)));
  child.on("exit", (exitCode, signal) => resolve(exitCode ?? (signal ? 1 : 0)));
});
await client.query("select pg_catalog.pg_advisory_unlock(pg_catalog.hashtext($1::text))", [name]);
await client.end();
process.exit(code);
