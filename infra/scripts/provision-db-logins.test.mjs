// Tests for provision-db-logins.mjs (task 068) against the migrated database in DATABASE_URL, whose login must
// be a superuser (it is locally and in CI). Each test runs in a transaction that is rolled back: the current
// database stands in for `app_preview` (provisioning connects to it), and `postgres` for `app`. The SCRAM
// test commits a throwaway role and drops it.
// Run: node --experimental-strip-types --test infra/scripts/provision-db-logins.test.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import { buildPoolConfig } from "../../packages/db/src/pool-config.ts";
import { ADVISORY_LOCK_KEY, provisionDbLogins, scramVerifier, verifyDbLogins } from "./provision-db-logins.mjs";

const { Client } = createRequire(new URL("../../packages/db/package.json", import.meta.url))("pg");

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to a migrated database.");
const loginConfig = buildPoolConfig({ DATABASE_URL: process.env.DATABASE_URL }, null);

const PASSWORDS = { previewOwnerPassword: "owner-pw-rolled-back-x1", previewRuntimePassword: "runtime-pw-rolled-back-y2" };

async function withClient(config, fn) {
  const client = new Client(config);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** As the superuser login, in a transaction that is always rolled back: `fn(client, names)`. */
async function inRolledBackTransaction(fn) {
  return withClient(loginConfig, async (client) => {
    await client.query("begin");
    try {
      const { rows } = await client.query("select current_database() as db, current_user::text as login");
      const names = {
        mainDb: "postgres",
        previewDb: rows[0].db,
        mainOwner: rows[0].login,
        previewOwner: "role_check_preview_owner",
        previewRuntime: "role_check_preview_runtime",
        ...PASSWORDS,
      };
      return await fn(client, names);
    } finally {
      await client.query("rollback");
    }
  });
}

const failuresAfter = (breakIt) =>
  inRolledBackTransaction(async (client, names) => {
    await provisionDbLogins(client, names);
    await breakIt(client, names);
    return (await verifyDbLogins(client, names)).join("\n");
  });

test("creates the preview logins: no CREATEROLE/CREATEDB, NOINHERIT, only app_user, only the preview database", async () => {
  await inRolledBackTransaction(async (client, names) => {
    await provisionDbLogins(client, names);
    assert.deepEqual(await verifyDbLogins(client, names), []);

    const { rows } = await client.query(
      `select r.rolname::text as name, r.rolcanlogin, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolbypassrls, r.rolinherit,
              pg_has_role(r.oid, 'app_user', 'MEMBER') as app_user_member,
              has_database_privilege(r.oid, $2, 'CONNECT') as main_connect,
              has_database_privilege(r.oid, $3, 'CONNECT') as preview_connect
       from pg_roles r where r.rolname = any ($1) order by 1`,
      [[names.previewOwner, names.previewRuntime], names.mainDb, names.previewDb],
    );
    const expected = { rolcanlogin: true, rolsuper: false, rolcreaterole: false, rolcreatedb: false, rolbypassrls: false, rolinherit: false, app_user_member: true, main_connect: false, preview_connect: true };
    assert.deepEqual(rows, [
      { name: names.previewOwner, ...expected },
      { name: names.previewRuntime, ...expected },
    ]);
  });
});

test("lets the preview owner run the migrations' role and schema statements", async () => {
  await inRolledBackTransaction(async (client, names) => {
    await provisionDbLogins(client, names);
    const { rows } = await client.query(
      `select pg_has_role($1, 'app_user', 'MEMBER WITH ADMIN OPTION') as admin_on_app_user,
              has_database_privilege($1, $2, 'CREATE') as create_schema,
              has_schema_privilege($1, 'public', 'CREATE') as create_in_public,
              pg_has_role($3, 'app_user', 'SET') as runtime_can_set,
              pg_has_role($3, 'app_user', 'MEMBER WITH ADMIN OPTION') as runtime_admin`,
      [names.previewOwner, names.previewDb, names.previewRuntime],
    );
    assert.deepEqual(rows[0], { admin_on_app_user: true, create_schema: true, create_in_public: true, runtime_can_set: true, runtime_admin: false });
  });
});

test("can run on every main deploy (idempotent, existing roles are fine)", async () => {
  await inRolledBackTransaction(async (client, names) => {
    await provisionDbLogins(client, names);
    await provisionDbLogins(client, names);
    assert.deepEqual(await verifyDbLogins(client, names), []);
  });
});

test("holds a transaction-level advisory lock while it provisions", async () => {
  await inRolledBackTransaction(async (client, names) => {
    await provisionDbLogins(client, names);
    const { rows } = await client.query(
      "select count(*)::int as held from pg_locks where locktype = 'advisory' and pid = pg_backend_pid() and objid = $1",
      [ADVISORY_LOCK_KEY],
    );
    assert.equal(rows[0].held, 1);
  });
});

test("never sends a password in plain text; stores SCRAM-SHA-256 verifiers", async () => {
  await inRolledBackTransaction(async (client, names) => {
    const sent = [];
    const spy = { query: (text, values) => (sent.push(String(text)), client.query(text, values)), escapeLiteral: (s) => client.escapeLiteral(s) };
    await provisionDbLogins(spy, names);
    for (const password of Object.values(PASSWORDS)) assert.ok(!sent.some((text) => text.includes(password)));
    const { rows } = await client.query("select rolpassword from pg_authid where rolname = any ($1)", [[names.previewOwner, names.previewRuntime]]);
    assert.equal(rows.length, 2);
    for (const row of rows) assert.match(row.rolpassword, /^SCRAM-SHA-256\$4096:/);
  });
});

test("a SCRAM verifier made in Node logs in with its password", async () => {
  const login = `role_check_scram_${process.pid}`;
  const password = `pw-${process.pid}-${Date.now()}`;
  await withClient(loginConfig, (client) => client.query(`create role ${login} login password '${scramVerifier(password)}'`));
  try {
    const url = new URL(process.env.DATABASE_URL);
    url.username = login;
    url.password = password;
    const { rows } = await withClient({ connectionString: url.toString() }, (client) => client.query("select current_user::text as me"));
    assert.equal(rows[0].me, login);
    url.password = `${password}-wrong`; // the server really checks passwords (not `trust`)
    await assert.rejects(withClient({ connectionString: url.toString() }, () => undefined), /password authentication failed/);
  } finally {
    await withClient(loginConfig, (client) => client.query(`drop role ${login}`));
  }
});

test("runs as a non-superuser CREATEROLE login, like Cloud SQL's owner login", async () => {
  await inRolledBackTransaction(async (client, names) => {
    // Cloud SQL: `app` has CREATEROLE, is a member of cloudsqlsuperuser (which owns the databases) and created
    // app_user (ADMIN on it).
    await client.query("create role role_check_cloudsqlsuperuser nologin");
    await client.query("create role role_check_app login createrole");
    await client.query("grant role_check_cloudsqlsuperuser to role_check_app");
    await client.query(`alter database "${names.previewDb}" owner to role_check_cloudsqlsuperuser`);
    await client.query(`alter database "${names.mainDb}" owner to role_check_cloudsqlsuperuser`);
    await client.query("grant app_user to role_check_app with admin option");
    await client.query("set local role role_check_app");
    const asApp = { ...names, mainOwner: "role_check_app" };
    await provisionDbLogins(client, asApp);
    assert.deepEqual(await verifyDbLogins(client, asApp), []);
  });
});

test("verification fails when anyone (PUBLIC) can connect to the main database", async () => {
  const failures = await failuresAfter((client, names) => client.query(`grant connect on database "${names.mainDb}" to public`));
  assert.match(failures, /PUBLIC can connect to the main database/);
});

test("verification fails when a preview login can connect to the main database", async () => {
  const failures = await failuresAfter((client, names) => client.query(`grant connect on database "${names.mainDb}" to ${names.previewRuntime}`));
  assert.match(failures, /role_check_preview_runtime can connect to the main database/);
});

test("verification fails when a preview login is a member of another role", async () => {
  const failures = await failuresAfter((client, names) => client.query(`grant "${names.mainOwner}" to ${names.previewOwner}`));
  assert.match(failures, /role_check_preview_owner is a member of roles other than app_user/);
});

test("verification fails when a preview login inherits", async () => {
  const failures = await failuresAfter((client, names) => client.query(`alter role ${names.previewRuntime} inherit`));
  assert.match(failures, /role_check_preview_runtime has rolinherit/);
});

test("verification fails when a preview login can create roles or databases", async () => {
  const failures = await failuresAfter((client, names) => client.query(`alter role ${names.previewOwner} createrole createdb`));
  assert.match(failures, /role_check_preview_owner has rolcreaterole/);
  assert.match(failures, /role_check_preview_owner has rolcreatedb/);
});

test("verification fails when the preview logins are missing (no main deploy yet)", async () => {
  await inRolledBackTransaction(async (client, names) => {
    const failures = (await verifyDbLogins(client, names)).join("\n");
    assert.match(failures, /role_check_preview_owner doesn't exist/);
  });
});

test("verification fails when anyone (PUBLIC) can create temporary tables in the preview database", async () => {
  const failures = await failuresAfter((client, names) => client.query(`grant temporary on database "${names.previewDb}" to public`));
  assert.match(failures, /PUBLIC has TEMPORARY on the preview database/);
});
