#!/usr/bin/env node
// Database logins of PR previews (task 068). Main deploys run it as main's owner login (`app`), connected to
// the preview database, in one transaction under an advisory lock; it is idempotent:
//   - preview_owner: LOGIN NOINHERIT, owns app_preview's objects and runs its migrations. ADMIN on app_user
//     (migration 0020 runs `GRANT app_user TO current_user`), CONNECT and CREATE on app_preview (drizzle-kit
//     creates its schema), USAGE and CREATE on its `public` schema;
//   - preview_runtime: LOGIN NOINHERIT, a SET-only member of app_user (the runtime switches with
//     `-c role=app_user`), CONNECT on app_preview;
//   - neither can connect to `app`: CONNECT on it is revoked from PUBLIC and granted to the owner login;
//   - TEMPORARY on app_preview is revoked from PUBLIC here: migration 0025 does it too, but run by
//     preview_owner, which doesn't own the database, it only warns.
// New roles are NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION and NOBYPASSRLS by default; verification
// checks all of it. Passwords go in as SCRAM-SHA-256 verifiers computed here, never in plain text.
// Previews run `--verify-only`: read-only, and it fails the deploy until a main deploy has provisioned.
//
// Why SQL and not Terraform's google_sql_user: Cloud SQL makes every API-created user a member of
// cloudsqlsuperuser (CREATEROLE, CREATEDB, owner of the databases, so CONNECT to `app` whatever PUBLIC has).
// Why not a Drizzle migration: logins differ per environment, and local databases have none.
//
// Usage (names from infra/scripts/environment.sh):
//   DATABASE_URL=postgres://app:…@127.0.0.1:5432/app_preview MAIN_DB_NAME=app PREVIEW_DB_NAME=app_preview \
//   MAIN_OWNER_LOGIN=app PREVIEW_OWNER_LOGIN=preview_owner PREVIEW_RUNTIME_LOGIN=preview_runtime \
//   PREVIEW_OWNER_PASSWORD=… PREVIEW_RUNTIME_PASSWORD=… \
//   node --experimental-strip-types infra/scripts/provision-db-logins.mjs [--verify-only]
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { buildPoolConfig, RUNTIME_ROLE } from "../../packages/db/src/pool-config.ts";

const { Client } = createRequire(new URL("../../packages/db/package.json", import.meta.url))("pg");

/** pg_advisory_xact_lock key: two main deploys never provision at once. */
export const ADVISORY_LOCK_KEY = 680_068;

const ident = (name) => `"${String(name).replaceAll('"', '""')}"`;

/**
 * A SCRAM-SHA-256 verifier for `password`, in the form Postgres stores (RFC 5802/7677, 4096 iterations).
 * Postgres accepts it in `ALTER ROLE … PASSWORD` and never sees the password. The passwords are ASCII
 * (Terraform's random_password, no special characters), so SASLprep leaves them as they are.
 */
export function scramVerifier(password, salt = randomBytes(16), iterations = 4096) {
  const salted = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const clientKey = createHmac("sha256", salted).update("Client Key").digest();
  const storedKey = createHash("sha256").update(clientKey).digest();
  const serverKey = createHmac("sha256", salted).update("Server Key").digest();
  return `SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${storedKey.toString("base64")}:${serverKey.toString("base64")}`;
}

/** Creates `login` unless it exists (also when another session creates it first: duplicate_object). */
async function ensureLogin(client, login) {
  await client.query("savepoint ensure_login");
  try {
    await client.query(`create role ${ident(login)} login`);
    await client.query("release savepoint ensure_login");
  } catch (error) {
    if (error.code !== "42710") throw error;
    await client.query("rollback to savepoint ensure_login");
  }
  await client.query(`alter role ${ident(login)} with login noinherit`);
}

async function setPassword(client, login, password) {
  if (!password) throw new Error(`The password of ${login} is empty.`);
  await client.query(`alter role ${ident(login)} password ${client.escapeLiteral(scramVerifier(password))}`);
}

/**
 * Creates or updates the preview logins and the grants. Call it inside a transaction, connected to the preview
 * database (the schema grant is per database), as main's owner login.
 * @param {{ query(text: string, values?: unknown[]): Promise<any>, escapeLiteral(s: string): string }} client
 * @param {{ mainDb: string, previewDb: string, mainOwner: string, previewOwner: string, previewRuntime: string,
 *           previewOwnerPassword: string, previewRuntimePassword: string }} names
 */
export async function provisionDbLogins(client, names) {
  const { mainDb, previewDb, mainOwner, previewOwner, previewRuntime } = names;
  const { rows } = await client.query("select current_database() as db");
  if (rows[0].db !== previewDb) throw new Error(`Connect to the preview database ${previewDb}, not ${rows[0].db}.`);
  await client.query("select pg_advisory_xact_lock($1)", [ADVISORY_LOCK_KEY]);

  for (const login of [previewOwner, previewRuntime]) await ensureLogin(client, login);
  await setPassword(client, previewOwner, names.previewOwnerPassword);
  await setPassword(client, previewRuntime, names.previewRuntimePassword);

  const runtimeRole = ident(RUNTIME_ROLE);
  await client.query(`grant ${runtimeRole} to ${ident(previewOwner)} with admin true, inherit false, set false`);
  await client.query(`grant ${runtimeRole} to ${ident(previewRuntime)} with inherit false, set true`);

  await client.query(`revoke connect on database ${ident(mainDb)} from public, ${ident(previewOwner)}, ${ident(previewRuntime)}`);
  await client.query(`grant connect on database ${ident(mainDb)} to ${ident(mainOwner)}`);
  await client.query(`grant connect, create on database ${ident(previewDb)} to ${ident(previewOwner)}`);
  await client.query(`grant connect on database ${ident(previewDb)} to ${ident(previewRuntime)}`);
  await client.query(`revoke temporary on database ${ident(previewDb)} from public`);
  await client.query(`grant usage, create on schema public to ${ident(previewOwner)}`);
}

/**
 * The failed checks (empty when all pass). Read-only; any login can run it connected to the preview database.
 * @returns {Promise<string[]>}
 */
export async function verifyDbLogins(client, { mainDb, previewDb, mainOwner, previewOwner, previewRuntime }) {
  const failures = [];
  const { rows } = await client.query(
    `select r.rolname::text as name, r.rolcanlogin, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolbypassrls,
            r.rolreplication, r.rolinherit,
            pg_has_role(r.oid, $2, 'SET') as can_set_runtime,
            pg_has_role(r.oid, $2, 'MEMBER WITH ADMIN OPTION') as runtime_admin,
            pg_has_role(r.oid, $3, 'MEMBER') as main_owner_member,
            array(select g.rolname::text from pg_auth_members m join pg_roles g on g.oid = m.roleid
                  where m.member = r.oid and g.rolname <> $2 order by 1) as other_roles,
            has_database_privilege(r.oid, $4, 'CONNECT') as main_connect,
            has_database_privilege(r.oid, $5, 'CONNECT') as preview_connect,
            has_database_privilege(r.oid, $5, 'CREATE') as preview_create,
            has_schema_privilege(r.oid, 'public', 'CREATE') as public_create
     from pg_roles r where r.rolname = any ($1)`,
    [[previewOwner, previewRuntime], RUNTIME_ROLE, mainOwner, mainDb, previewDb],
  );
  const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
  for (const [login, isOwner] of [[previewOwner, true], [previewRuntime, false]]) {
    const role = byName[login];
    if (!role) {
      failures.push(`${login} doesn't exist (run a main deploy first: it provisions the preview logins)`);
      continue;
    }
    if (!role.rolcanlogin) failures.push(`${login} can't log in`);
    for (const attribute of ["rolsuper", "rolcreaterole", "rolcreatedb", "rolbypassrls", "rolreplication", "rolinherit"]) {
      if (role[attribute]) failures.push(`${login} has ${attribute}`);
    }
    if (role.main_owner_member) failures.push(`${login} is a member of main's owner login ${mainOwner}`);
    if (role.other_roles.length > 0) failures.push(`${login} is a member of roles other than ${RUNTIME_ROLE}: ${role.other_roles.join(", ")}`);
    if (role.main_connect) failures.push(`${login} can connect to the main database ${mainDb}`);
    if (!role.preview_connect) failures.push(`${login} can't connect to the preview database ${previewDb}`);
    if (isOwner) {
      if (!role.runtime_admin) failures.push(`${login} has no ADMIN on ${RUNTIME_ROLE} (migration 0020 grants it to itself)`);
      if (!role.preview_create) failures.push(`${login} can't create schemas in ${previewDb} (drizzle-kit needs one)`);
      if (!role.public_create) failures.push(`${login} can't create in ${previewDb}'s public schema`);
    } else {
      if (!role.can_set_runtime) failures.push(`${login} can't SET ROLE ${RUNTIME_ROLE}`);
      if (role.runtime_admin) failures.push(`${login} has ADMIN on ${RUNTIME_ROLE}`);
    }
  }

  const databases = await client.query(
    `select exists (select 1 from pg_database d, aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a
                    where d.datname = $1 and a.grantee = 0 and a.privilege_type = 'CONNECT') as public_connect,
            exists (select 1 from pg_database d, aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a
                    where d.datname = $2 and a.grantee = 0 and a.privilege_type = 'TEMPORARY') as public_temp,
            has_database_privilege($3, $1, 'CONNECT') as owner_connect`,
    [mainDb, previewDb, mainOwner],
  );
  const { public_connect: publicConnect, public_temp: publicTemp, owner_connect: ownerConnect } = databases.rows[0];
  if (publicConnect) failures.push(`PUBLIC can connect to the main database ${mainDb}`);
  if (publicTemp) failures.push(`PUBLIC has TEMPORARY on the preview database ${previewDb}`);
  if (!ownerConnect) failures.push(`main's owner login ${mainOwner} can't connect to ${mainDb}`);
  return failures;
}

function namesFromEnv(env, { withPasswords }) {
  const names = {
    mainDb: env.MAIN_DB_NAME,
    previewDb: env.PREVIEW_DB_NAME,
    mainOwner: env.MAIN_OWNER_LOGIN,
    previewOwner: env.PREVIEW_OWNER_LOGIN,
    previewRuntime: env.PREVIEW_RUNTIME_LOGIN,
    ...(withPasswords && { previewOwnerPassword: env.PREVIEW_OWNER_PASSWORD, previewRuntimePassword: env.PREVIEW_RUNTIME_PASSWORD }),
  };
  const missing = Object.entries(names).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`missing ${missing.join(", ")} (source infra/scripts/environment.sh)`);
  return names;
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");
  const names = namesFromEnv(process.env, { withPasswords: !verifyOnly });
  // The login's own connection (no role switch).
  const client = new Client(buildPoolConfig(process.env, null));
  await client.connect();
  try {
    let failures;
    if (verifyOnly) {
      failures = await verifyDbLogins(client, names);
    } else {
      await client.query("begin");
      try {
        await provisionDbLogins(client, names);
        failures = await verifyDbLogins(client, names);
        await client.query(failures.length > 0 ? "rollback" : "commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
    if (failures.length > 0) {
      console.error("Database logins check FAILED:");
      for (const failure of failures) console.error(`  - ${failure}`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `Database logins ok${verifyOnly ? " (verified)" : " (provisioned)"}: ${names.previewOwner} and ${names.previewRuntime} ` +
        `reach ${names.previewDb}, not ${names.mainDb}; ${names.mainDb} is closed to PUBLIC.`,
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
