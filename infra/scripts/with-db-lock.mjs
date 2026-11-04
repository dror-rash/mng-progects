#!/usr/bin/env node
// Runs a command while holding a Postgres advisory lock (task 068), so two deploys never migrate the same
// database at once (two PRs share app_preview; drizzle-kit migrate takes no lock of its own). The lock is
// session-level, on its own connection from DATABASE_URL, and ends with that connection even if this
// process dies. Waits for the lock as long as it takes; the deploy job's timeout bounds it.
// Usage: DATABASE_URL=… node --experimental-strip-types infra/scripts/with-db-lock.mjs <lock name> -- <command> [args…]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

import { buildPoolConfig } from "../../packages/db/src/pool-config.ts";

const { Client } = createRequire(new URL("../../packages/db/package.json", import.meta.url))("pg");

const [name, separator, command, ...args] = process.argv.slice(2);
if (!name || separator !== "--" || !command) {
  console.error("Usage: with-db-lock.mjs <lock name> -- <command> [args…]");
  process.exit(2);
}

const client = new Client(buildPoolConfig(process.env, null));
await client.connect();
// hashtext: a stable 32-bit key per name, in the database's own terms.
await client.query("select pg_advisory_lock(hashtext($1))", [name]);
const code = await new Promise((resolve) => {
  const child = spawn(command, args, { stdio: "inherit" });
  child.on("error", (error) => (console.error(error.message), resolve(127)));
  child.on("exit", (exitCode, signal) => resolve(exitCode ?? (signal ? 1 : 0)));
});
await client.query("select pg_advisory_unlock(hashtext($1))", [name]);
await client.end();
process.exit(code);
