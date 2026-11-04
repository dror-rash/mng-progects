// Tests for provision-db-logins.mjs (task 068) against the migrated database in DATABASE_URL, whose login
// must be a superuser or the owner (it is locally and in CI). Everything runs in a rolled-back transaction:
// the current database stands in for `app`, and `postgres` for `app_preview`.
// Run: node --experimental-strip-types --test infra/scripts/provision-db-logins.test.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import { buildPoolConfig } from "../../packages/db/src/pool-config.ts";
import { provisionDbLogins, verifyDbLogins } from "./provision-db-logins.mjs";

const { Client } = createRequire(new URL("../../packages/db/package.json", import.meta.url))("pg");

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to a migrated database.");

const PREVIEW_LOGIN = "role_check_preview_login";

/** As the login, in a transaction that is always rolled back: `fn(client, names)`. */
async function inRolledBackTransaction(fn) {
  const client = new Client(buildPoolConfig({ DATABASE_URL: process.env.DATABASE_URL }, null));
  await client.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query("select current_database() as db, current_user::text as login");
    const names = {
      mainDb: rows[0].db,
      previewDb: "postgres",
      ownerLogin: rows[0].login,
      previewLogin: PREVIEW_LOGIN,
      previewPassword: "not-a-real-password-it-is-rolled-back",
    };
    return await fn(client, names);
  } finally {
    await client.query("rollback");
    await client.end();
  }
}

test("creates a preview login that may only SET ROLE app_user and connect to the preview database", async () => {
  await inRolledBackTransaction(async (client, names) => {
    await provisionDbLogins(client, names);
    assert.deepEqual(await verifyDbLogins(client, names), []);

    const { rows } = await client.query(
      `select r.rolcanlogin, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolbypassrls, r.rolinherit,
              pg_has_role(r.oid, 'app_user', 'SET') as can_set_app_user,
              has_database_privilege(r.oid, $2, 'CONNECT') as main_connect,
              has_database_privilege(r.oid, $3, 'CONNECT') as preview_connect
       from pg_roles r where r.rolname = $1`,
      [names.previewLogin, names.mainDb, names.previewDb],
    );
    assert.deepEqual(rows[0], {
      rolcanlogin: true,
      rolsuper: false,
      rolcreaterole: false,
      rolcreatedb: false,
      rolbypassrls: false,
      rolinherit: false,
      can_set_app_user: true,
      main_connect: false,
      preview_connect: true,
    });
  });
});

test("can run on every deploy (idempotent)", async () => {
  await inRolledBackTransaction(async (client, names) => {
    await provisionDbLogins(client, names);
    await provisionDbLogins(client, names);
    assert.deepEqual(await verifyDbLogins(client, names), []);
  });
});

test("verification fails when anyone (PUBLIC) can connect to the main database", async () => {
  await inRolledBackTransaction(async (client, names) => {
    await provisionDbLogins(client, names);
    await client.query(`grant connect on database "${names.mainDb}" to public`);
    assert.match((await verifyDbLogins(client, names)).join("\n"), /PUBLIC can connect to/);
  });
});

test("verification fails when the preview login is a member of another role", async () => {
  await inRolledBackTransaction(async (client, names) => {
    await provisionDbLogins(client, names);
    await client.query(`grant "${names.ownerLogin}" to ${PREVIEW_LOGIN}`);
    const failures = (await verifyDbLogins(client, names)).join("\n");
    assert.match(failures, /is a member of roles other than app_user/);
    assert.match(failures, /can connect to the main database/);
  });
});
