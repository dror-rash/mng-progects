#!/usr/bin/env node
// Database logins of PR previews (task 068). Main deploys run it as main's owner login (`app`); it is
// idempotent:
//   - preview_owner: LOGIN NOINHERIT, owns app_preview's objects and runs its migrations. ADMIN on app_user
//     (migration 0020 runs `GRANT app_user TO current_user`), CONNECT and CREATE on app_preview (drizzle-kit
//     creates its schema), USAGE and CREATE on its `public` schema;
//   - preview_runtime: LOGIN NOINHERIT, a SET-only member of app_user (the runtime switches with
//     `-c role=app_user`), CONNECT on app_preview;
//   - both have a CONNECTION LIMIT (db-f1-micro allows 25 connections in all, main's included);
//   - neither can connect to `app`: CONNECT on it is revoked from PUBLIC and granted to the owner login;
//   - TEMPORARY on app_preview is revoked from PUBLIC here: migration 0025 does it too, but run by
//     preview_owner, which doesn't own the database, it only warns.
// New roles are NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION and NOBYPASSRLS by default; verification
// checks all of it. Passwords go in as SCRAM-SHA-256 verifiers computed here, never in plain text.
//
// Two connections, because PR migrations can write to app_preview (functions planted in its `public`): the
// role and database statements run on a connection to `app`, which PR code can't touch; only the schema grant
// runs on app_preview. Both pin search_path and call catalog functions qualified (pg-safe.mjs). The app_preview
// connection holds the preview migration lock (with-db-lock.mjs, same name) for the whole run, so a preview
// never migrates halfway through.
//
// Previews run `--verify-only` on app_preview: read-only, and it fails the deploy until a main deploy has
// provisioned.
//
// Why SQL and not Terraform's google_sql_user: Cloud SQL makes every API-created user a member of
// cloudsqlsuperuser (CREATEROLE, CREATEDB, owner of the databases, so CONNECT to `app` whatever PUBLIC has).
// Why not a Drizzle migration: logins differ per environment, and local databases have none.
//
// Usage (names from infra/scripts/environment.sh):
//   MAIN_DATABASE_URL=postgres://app:…@127.0.0.1:5432/app DATABASE_URL=postgres://app:…@127.0.0.1:5432/app_preview \
//   MAIN_DB_NAME=app PREVIEW_DB_NAME=app_preview MAIN_OWNER_LOGIN=app PREVIEW_OWNER_LOGIN=preview_owner \
//   PREVIEW_RUNTIME_LOGIN=preview_runtime PREVIEW_OWNER_PASSWORD=… PREVIEW_RUNTIME_PASSWORD=… \
//   node --experimental-strip-types infra/scripts/provision-db-logins.mjs
// Previews: DATABASE_URL=<preview_owner on app_preview> … provision-db-logins.mjs --verify-only
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

import { buildPoolConfig, RUNTIME_ROLE } from "../../packages/db/src/pool-config.ts";
import { Client, pinSearchPath, withPinnedSearchPath } from "./pg-safe.mjs";

/**
 * Connection limits. db-f1-micro has max_connections 25 for everything; previews run one instance per zone
 * (variables.tf) with a pool of up to 5, and only the @smoke set. preview_owner: two PRs at once hold a lock
 * connection each, one migrates, and a verification may be running.
 */
export const CONNECTION_LIMITS = { previewOwner: 4, previewRuntime: 8 };

/** The advisory lock name preview migrations take (deploy.yml: with-db-lock.mjs "migrate-$DB_NAME"). */
export const migrationLockName = (database) => `migrate-${database}`;

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
async function ensureLogin(client, login, connectionLimit) {
  await client.query("savepoint ensure_login");
  try {
    await client.query(`create role ${ident(login)} login`);
    await client.query("release savepoint ensure_login");
  } catch (error) {
    if (error.code !== "42710") throw error;
    await client.query("rollback to savepoint ensure_login");
  }
  await client.query(`alter role ${ident(login)} with login noinherit connection limit ${Number(connectionLimit)}`);
}

async function setPassword(client, login, password) {
  if (!password) throw new Error(`The password of ${login} is empty.`);
  await client.query(`alter role ${ident(login)} password ${client.escapeLiteral(scramVerifier(password))}`);
}

/**
 * Creates or updates the preview logins and the grants. The caller opens a transaction on each client, and
 * commits `main` before `preview` (the preview grant names roles `main` creates).
 * @param {{ main: Client, preview: Client }} clients main: connected to the main database; preview: to the
 *   preview database. The tests pass one client for both.
 * @param {{ mainDb: string, previewDb: string, mainOwner: string, previewOwner: string, previewRuntime: string,
 *           previewOwnerPassword: string, previewRuntimePassword: string }} names
 */
export async function provisionDbLogins({ main, preview }, names) {
  const { mainDb, previewDb, mainOwner, previewOwner, previewRuntime } = names;
  await pinSearchPath(preview);
  await pinSearchPath(main);
  await preview.query("select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext($1::text))", [migrationLockName(previewDb)]);

  await ensureLogin(main, previewOwner, CONNECTION_LIMITS.previewOwner);
  await ensureLogin(main, previewRuntime, CONNECTION_LIMITS.previewRuntime);
  await setPassword(main, previewOwner, names.previewOwnerPassword);
  await setPassword(main, previewRuntime, names.previewRuntimePassword);

  const runtimeRole = ident(RUNTIME_ROLE);
  await main.query(`grant ${runtimeRole} to ${ident(previewOwner)} with admin true, inherit false, set false`);
  await main.query(`grant ${runtimeRole} to ${ident(previewRuntime)} with inherit false, set true`);

  await main.query(`revoke connect on database ${ident(mainDb)} from public, ${ident(previewOwner)}, ${ident(previewRuntime)}`);
  await main.query(`grant connect on database ${ident(mainDb)} to ${ident(mainOwner)}`);
  await main.query(`grant connect, create on database ${ident(previewDb)} to ${ident(previewOwner)}`);
  await main.query(`grant connect on database ${ident(previewDb)} to ${ident(previewRuntime)}`);
  await main.query(`revoke temporary on database ${ident(previewDb)} from public`);

  return {
    /** Run after `main` commits: the schema grant, on the preview database. */
    async grantPreviewSchema() {
      await preview.query(`grant usage, create on schema public to ${ident(previewOwner)}`);
    },
  };
}

/**
 * The failed checks (empty when all pass). Read-only, on a connection to the preview database (the schema
 * privilege is per database); everything else it reads is shared catalogs.
 * @returns {Promise<string[]>}
 */
export async function verifyDbLogins(client, { mainDb, previewDb, mainOwner, previewOwner, previewRuntime }) {
  await pinSearchPath(client);
  const failures = [];
  const { rows } = await client.query(
    `select r.rolname::text as name, r.rolcanlogin, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolbypassrls,
            r.rolreplication, r.rolinherit, r.rolconnlimit,
            pg_catalog.pg_has_role(r.oid, $2::text::pg_catalog.name, 'MEMBER') as runtime_member,
            pg_catalog.pg_has_role(r.oid, $3::text::pg_catalog.name, 'MEMBER') as main_owner_member,
            array(select g.rolname::text from pg_catalog.pg_auth_members m join pg_catalog.pg_roles g on g.oid = m.roleid
                  where m.member = r.oid and g.rolname <> $2::text order by 1) as other_roles,
            array(select pg_catalog.concat_ws(':', case when m.grantor = r.oid then 'self' else 'other' end,
                                               m.admin_option, m.inherit_option, m.set_option)
                  from pg_catalog.pg_auth_members m join pg_catalog.pg_roles g on g.oid = m.roleid
                  where m.member = r.oid and g.rolname = $2::text order by 1) as runtime_grants,
            pg_catalog.has_database_privilege(r.oid, $4::text::pg_catalog.name, 'CONNECT') as main_connect,
            pg_catalog.has_database_privilege(r.oid, $5::text::pg_catalog.name, 'CONNECT') as preview_connect,
            pg_catalog.has_database_privilege(r.oid, $5::text::pg_catalog.name, 'CREATE') as preview_create,
            pg_catalog.has_schema_privilege(r.oid, 'public'::pg_catalog.name, 'CREATE') as public_create
     from pg_catalog.pg_roles r where r.rolname = any ($1::text[])`,
    [[previewOwner, previewRuntime], RUNTIME_ROLE, mainOwner, mainDb, previewDb],
  );
  const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
  // Memberships of app_user, as "<grantor>:<admin>:<inherit>:<set>". preview_owner: the provisioned grant
  // (ADMIN only), plus the one migration 0020 makes as preview_owner itself (SET, no ADMIN) once a preview
  // has migrated. That second one is harmless (preview_owner owns more than app_user can do) and isn't
  // revoked: main deploys would race the next preview's migration.
  const allowedGrants = {
    [previewOwner]: [["other:t:f:f"], ["other:t:f:f", "self:f:f:t"]],
    [previewRuntime]: [["other:f:f:t"]],
  };
  const limits = { [previewOwner]: CONNECTION_LIMITS.previewOwner, [previewRuntime]: CONNECTION_LIMITS.previewRuntime };
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
    if (role.rolconnlimit !== limits[login]) failures.push(`${login}'s connection limit is ${role.rolconnlimit}, not ${limits[login]}`);
    if (role.main_owner_member) failures.push(`${login} is a member of main's owner login ${mainOwner}`);
    if (role.other_roles.length > 0) failures.push(`${login} is a member of roles other than ${RUNTIME_ROLE}: ${role.other_roles.join(", ")}`);
    const grants = role.runtime_grants.join(",");
    if (!allowedGrants[login].some((allowed) => allowed.join(",") === grants)) {
      failures.push(`${login}'s memberships of ${RUNTIME_ROLE} aren't the provisioned ones: ${grants || "none"}`);
    }
    if (role.main_connect) failures.push(`${login} can connect to the main database ${mainDb}`);
    if (!role.preview_connect) failures.push(`${login} can't connect to the preview database ${previewDb}`);
    if (isOwner) {
      if (!role.preview_create) failures.push(`${login} can't create schemas in ${previewDb} (drizzle-kit needs one)`);
      if (!role.public_create) failures.push(`${login} can't create in ${previewDb}'s public schema`);
    }
  }

  const databases = await client.query(
    `select exists (select 1 from pg_catalog.pg_database d, pg_catalog.aclexplode(coalesce(d.datacl, pg_catalog.acldefault('d', d.datdba))) a
                    where d.datname = $1::text and a.grantee = 0 and a.privilege_type = 'CONNECT') as public_connect,
            exists (select 1 from pg_catalog.pg_database d, pg_catalog.aclexplode(coalesce(d.datacl, pg_catalog.acldefault('d', d.datdba))) a
                    where d.datname = $2::text and a.grantee = 0 and a.privilege_type = 'TEMPORARY') as public_temp,
            pg_catalog.has_database_privilege($3::text::pg_catalog.name, $1::text::pg_catalog.name, 'CONNECT') as owner_connect`,
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

/** An open client from `url` (the login's own connection, no role switch, search_path pinned) on `database`. */
async function connect(url, database) {
  if (!url) throw new Error(`missing the connection URL for ${database}`);
  const client = new Client(withPinnedSearchPath(buildPoolConfig({ DATABASE_URL: url }, null)));
  await client.connect();
  const { rows } = await client.query("select pg_catalog.current_database()::text as db");
  if (rows[0].db !== database) {
    await client.end();
    throw new Error(`expected a connection to ${database}, got ${rows[0].db}`);
  }
  return client;
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");
  const names = namesFromEnv(process.env, { withPasswords: !verifyOnly });
  const preview = await connect(process.env.DATABASE_URL, names.previewDb);
  let mainClient;
  try {
    let failures;
    if (verifyOnly) {
      failures = await verifyDbLogins(preview, names);
    } else {
      mainClient = await connect(process.env.MAIN_DATABASE_URL, names.mainDb);
      await preview.query("begin");
      try {
        await mainClient.query("begin");
        const { grantPreviewSchema } = await provisionDbLogins({ main: mainClient, preview }, names);
        await mainClient.query("commit");
        await grantPreviewSchema();
        await preview.query("commit");
      } catch (error) {
        await mainClient.query("rollback").catch(() => {});
        await preview.query("rollback").catch(() => {});
        throw error;
      }
      failures = await verifyDbLogins(preview, names);
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
    await preview.end();
    await mainClient?.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Database logins check FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
