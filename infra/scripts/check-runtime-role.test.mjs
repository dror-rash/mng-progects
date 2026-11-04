// Tests for check-runtime-role.mjs (task 068) against the migrated database in DATABASE_URL, whose login
// must be able to grant (the owner or a superuser). Every change to roles or tables is rolled back.
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

/** As the login: runs `breakIt`, switches to app_user, checks, and rolls everything back. */
async function checkAfter(breakIt) {
  return withClient(buildPoolConfig(env, null), async (client) => {
    await client.query("begin");
    try {
      await breakIt(client);
      await client.query("set local role app_user");
      return await checkRuntimeRole(client);
    } finally {
      await client.query("rollback");
    }
  });
}

/** A workspace row, so a bypassed row-level security shows in the probe. */
async function insertProbeWorkspace(client) {
  await client.query("insert into workspace (id, name) values ('role-check-probe', 'Role check probe')");
}

function runCli(databaseUrl) {
  return promisify(execFile)(process.execPath, ["--experimental-strip-types", "--no-warnings", script], {
    env: { PATH: process.env.PATH, DATABASE_URL: databaseUrl },
  });
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
  const failures = await checkAfter(async (client) => {
    const { rows } = await client.query("select current_database() as db");
    await client.query(`grant temporary on database "${rows[0].db}" to app_user`);
  });
  assert.match(failures.join("\n"), /app_user has TEMPORARY/);
});

// The login that owns the tables is itself a member of app_user, so app_user can't be granted the login
// (circular). The bypass that can happen: a table owned by another role app_user is a member of, or by
// app_user itself (a migration run as app_user, an ALTER ... OWNER TO).
test("fails when app_user is a member of a table's owner (row-level security bypassed)", async () => {
  const failures = await checkAfter(async (client) => {
    await insertProbeWorkspace(client);
    await client.query("create role role_check_owner nologin");
    await client.query("grant role_check_owner to app_user");
    await client.query("alter table workspace owner to role_check_owner");
  });
  const text = failures.join("\n");
  assert.match(text, /app_user is a member of the owner of: workspace/);
  assert.match(text, /without app\.user_id, app_user sees [1-9]\d* workspace row/);
});

test("fails when app_user owns a table", async () => {
  const failures = await checkAfter(async (client) => {
    await insertProbeWorkspace(client);
    await client.query("alter table workspace owner to app_user");
  });
  assert.match(failures.join("\n"), /app_user is a member of the owner of: workspace/);
});

test("fails when app_user has BYPASSRLS", async () => {
  const failures = await checkAfter(async (client) => {
    await insertProbeWorkspace(client);
    await client.query("alter role app_user bypassrls");
  });
  assert.match(failures.join("\n"), /app_user has BYPASSRLS/);
});

test("fails when a table outside the Better Auth allowlist has row-level security off", async () => {
  const failures = await checkAfter(async (client) => {
    await client.query("alter table workspace disable row level security");
  });
  assert.match(failures.join("\n"), /row-level security is off on: workspace/);
});

test("the command exits 0 on the migrated database and prints what it checked", async () => {
  const { stdout } = await runCli(env.DATABASE_URL);
  assert.match(stdout, /Runtime role check passed/);
});

test("the command exits non-zero and prints FAILED when it can't check", async () => {
  const missing = env.DATABASE_URL.replace(/\/[^/?]+(\?.*)?$/, "/role_check_no_such_database$1");
  await assert.rejects(runCli(missing), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /Runtime role check FAILED/);
    return true;
  });
});
