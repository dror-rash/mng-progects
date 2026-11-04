#!/usr/bin/env node
// Database logins per environment (task 068). Runs on every deploy, after `db:migrate`, as the owner login
// (`app`), and is idempotent:
//   - the preview login (`preview_runtime`): LOGIN, no CREATEROLE/CREATEDB, NOINHERIT, a member of app_user
//     with SET only (the runtime switches with `-c role=app_user`), CONNECT to the preview database only;
//   - the main database: CONNECT revoked from PUBLIC, granted to the owner login.
// Then it verifies all of that and fails the deploy otherwise.
//
// Why SQL here and not Terraform's google_sql_user: Cloud SQL makes every API-created user a member of
// cloudsqlsuperuser (CREATEROLE, CREATEDB, and the owner of the databases, so CONNECT to `app` whatever
// PUBLIC has). A role created by SQL is a member of nothing. Terraform generates its password into the
// `db-preview-password` secret. Not a Drizzle migration either: logins and database names differ per
// environment, and local databases have no preview login.
//
// Usage (names from infra/scripts/environment.sh):
//   DATABASE_URL=postgres://app:…@127.0.0.1:5432/app MAIN_DB_NAME=app PREVIEW_DB_NAME=app_preview \
//   DB_OWNER_LOGIN=app PREVIEW_DB_LOGIN=preview_runtime PREVIEW_DB_PASSWORD=… \
//   node --experimental-strip-types infra/scripts/provision-db-logins.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { buildPoolConfig, RUNTIME_ROLE } from "../../packages/db/src/pool-config.ts";

const { Client } = createRequire(new URL("../../packages/db/package.json", import.meta.url))("pg");

const ident = (name) => `"${String(name).replaceAll('"', '""')}"`;

/**
 * Creates or updates the preview login and the database grants. Only attributes a CREATEROLE (non-superuser)
 * owner may set; a new role is NOSUPERUSER, NOREPLICATION and NOBYPASSRLS by default, and verify checks it.
 * @param {{ query(text: string, values?: unknown[]): Promise<unknown>, escapeLiteral?(s: string): string }} client
 * @param {{ mainDb: string, previewDb: string, ownerLogin: string, previewLogin: string, previewPassword: string }} names
 */
export async function provisionDbLogins(client, { mainDb, previewDb, ownerLogin, previewLogin, previewPassword }) {
  if (!previewPassword) throw new Error("The preview login's password is empty.");
  const login = ident(previewLogin);
  const exists = await client.query("select 1 from pg_roles where rolname = $1", [previewLogin]);
  if (exists.rows.length === 0) await client.query(`create role ${login} login`);
  // Utility statements take no parameters: the password goes in as an escaped literal (never logged).
  const password = client.escapeLiteral(previewPassword);
  await client.query(`alter role ${login} with login nocreatedb nocreaterole noinherit password ${password}`);
  await client.query(`grant ${ident(RUNTIME_ROLE)} to ${login} with inherit false, set true`);

  await client.query(`revoke connect on database ${ident(mainDb)} from public`);
  await client.query(`revoke connect on database ${ident(mainDb)} from ${login}`);
  await client.query(`grant connect on database ${ident(mainDb)} to ${ident(ownerLogin)}`);
  await client.query(`grant connect on database ${ident(previewDb)} to ${login}`);
}

/**
 * The failed checks (empty when all pass). Read-only.
 * @returns {Promise<string[]>}
 */
export async function verifyDbLogins(client, { mainDb, previewDb, ownerLogin, previewLogin }) {
  const failures = [];
  const { rows } = await client.query(
    `select r.rolcanlogin, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolbypassrls, r.rolreplication,
            pg_has_role(r.oid, $2, 'SET') as can_set_runtime,
            pg_has_role(r.oid, $3, 'MEMBER') as owner_member,
            array(select g.rolname::text from pg_auth_members m join pg_roles g on g.oid = m.roleid
                  where m.member = r.oid and g.rolname <> $2 order by 1) as other_roles,
            has_database_privilege(r.oid, $4, 'CONNECT') as main_connect,
            has_database_privilege(r.oid, $5, 'CONNECT') as preview_connect
     from pg_roles r where r.rolname = $1`,
    [previewLogin, RUNTIME_ROLE, ownerLogin, mainDb, previewDb],
  );
  const login = rows[0];
  if (!login) return [`the preview login ${previewLogin} doesn't exist`];
  if (!login.rolcanlogin) failures.push(`${previewLogin} can't log in`);
  for (const attribute of ["rolsuper", "rolcreaterole", "rolcreatedb", "rolbypassrls", "rolreplication"]) {
    if (login[attribute]) failures.push(`${previewLogin} has ${attribute}`);
  }
  if (!login.can_set_runtime) failures.push(`${previewLogin} can't SET ROLE ${RUNTIME_ROLE}`);
  if (login.owner_member) failures.push(`${previewLogin} is a member of the owner login ${ownerLogin}`);
  if (login.other_roles.length > 0) {
    failures.push(`${previewLogin} is a member of roles other than ${RUNTIME_ROLE}: ${login.other_roles.join(", ")}`);
  }
  if (login.main_connect) failures.push(`${previewLogin} can connect to the main database ${mainDb}`);
  if (!login.preview_connect) failures.push(`${previewLogin} can't connect to the preview database ${previewDb}`);

  const main = await client.query(
    `select exists (select 1 from pg_database d, aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a
                    where d.datname = $1 and a.grantee = 0 and a.privilege_type = 'CONNECT') as public_connect,
            has_database_privilege($2, $1, 'CONNECT') as owner_connect`,
    [mainDb, ownerLogin],
  );
  if (main.rows[0].public_connect) failures.push(`PUBLIC can connect to the main database ${mainDb}`);
  if (!main.rows[0].owner_connect) failures.push(`the owner login ${ownerLogin} can't connect to ${mainDb}`);
  return failures;
}

function namesFromEnv(env) {
  const names = {
    mainDb: env.MAIN_DB_NAME,
    previewDb: env.PREVIEW_DB_NAME,
    ownerLogin: env.DB_OWNER_LOGIN,
    previewLogin: env.PREVIEW_DB_LOGIN,
    previewPassword: env.PREVIEW_DB_PASSWORD,
  };
  const missing = Object.entries(names).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`missing ${missing.join(", ")} (source infra/scripts/environment.sh)`);
  return names;
}

async function main() {
  const names = namesFromEnv(process.env);
  // The owner's own connection (no role switch): it creates roles and grants.
  const client = new Client(buildPoolConfig(process.env, null));
  await client.connect();
  try {
    await provisionDbLogins(client, names);
    const failures = await verifyDbLogins(client, names);
    if (failures.length > 0) {
      console.error("Database logins check FAILED:");
      for (const failure of failures) console.error(`  - ${failure}`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `Database logins ok: ${names.previewLogin} may SET ROLE ${RUNTIME_ROLE} and connect to ${names.previewDb} only; ` +
        `${names.mainDb} is closed to PUBLIC.`,
    );
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Database logins check FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
