// Tests for check-runtime-role.mjs (task 068) against the migrated database in DATABASE_URL.
// Run: node --experimental-strip-types --test infra/scripts/check-runtime-role.test.mjs
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { buildPoolConfig } from "../../packages/db/src/pool-config.ts";
import { checkRuntimeRole } from "./check-runtime-role.mjs";

const { Client } = createRequire(new URL("../../packages/db/package.json", import.meta.url))("pg");
const script = fileURLToPath(new URL("./check-runtime-role.mjs", import.meta.url));

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to a migrated database.");
const env = { DATABASE_URL: process.env.DATABASE_URL };

/** Runs `fn` with a client opened from `config`, and closes it. */
async function withClient(config, fn) {
  const client = new Client(config);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

test("passes on a connection opened like the runtime's (role option on)", async () => {
  const failures = await withClient(buildPoolConfig(env), checkRuntimeRole);
  assert.deepEqual(failures, []);
});

test("fails on a connection without the role option (the login user)", async () => {
  const failures = await withClient(buildPoolConfig(env, null), checkRuntimeRole);
  assert.match(failures.join("\n"), /current_user is ".+", not "app_user"/);
});

test("fails when app_user can create temporary tables (migration 0025 not applied)", async () => {
  const failures = await withClient(buildPoolConfig(env, null), async (client) => {
    await client.query("begin");
    try {
      const { rows } = await client.query("select current_database() as db");
      await client.query(`grant temporary on database "${rows[0].db}" to app_user`);
      await client.query("set local role app_user");
      return await checkRuntimeRole(client);
    } finally {
      await client.query("rollback");
    }
  });
  assert.match(failures.join("\n"), /app_user has TEMPORARY/);
});

test("the command exits 0 on the migrated database and prints what it checked", async () => {
  const { stdout } = await promisify(execFile)(process.execPath, ["--experimental-strip-types", script], {
    env: { PATH: process.env.PATH, DATABASE_URL: env.DATABASE_URL },
  });
  assert.match(stdout, /Runtime role check passed/);
});
