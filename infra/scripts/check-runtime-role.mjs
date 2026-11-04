#!/usr/bin/env node
// Runtime role check (task 068, ADR-0006): after `db:migrate`, open a connection exactly as the runtime pool
// does (the environment's runtime login, `-c role=app_user` from buildPoolConfig) and fail unless
//   - current_user is app_user, and the login may SET ROLE app_user;
//   - app_user isn't a superuser and hasn't BYPASSRLS;
//   - app_user owns no public table and isn't a member of any table's owner (owners bypass row-level
//     security, which isn't forced);
//   - row-level security is on for every public table except Better Auth's (no RLS by design, ADR-0006);
//   - app_user can't create temporary tables (migration 0025);
//   - app_user can use no view, materialized view or SECURITY DEFINER function but the allowlisted ones,
//     and no table outside public (each runs with its owner's rights or has no policies of ours);
//   - without app.user_id, app_user sees no workspace (the probe: row-level security really applies).
//
// Usage: DATABASE_URL=postgres://<login>:…@127.0.0.1:5432/<db> node --experimental-strip-types infra/scripts/check-runtime-role.mjs
// (deploy.yml runs it through the Cloud SQL Auth Proxy; CI runs its tests against the migrated database).
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { buildPoolConfig, RUNTIME_ROLE } from "../../packages/db/src/pool-config.ts";

/** Better Auth's tables: grants and no row-level security (ADR-0006). Any other public table needs it. */
export const TABLES_WITHOUT_RLS = ["account", "session", "user", "verification"];

/** The views of the migrations (0020, 0028): security_barrier views that check access themselves. */
export const ALLOWED_VIEWS = ["customer_name", "site_choice"];

/**
 * The SECURITY DEFINER functions of the migrations that app_user may run: the access functions and the actions
 * built on them (ADR-0006). Taken from packages/db/migrations (every `SECURITY DEFINER` function, minus the
 * trigger functions, which app_user can't run). A new one fails the deploy until it is added here on purpose.
 */
export const ALLOWED_DEFINER_FUNCTIONS = [
  "access_role", "can_change_attachment", "can_change_customer", "can_change_project", "can_change_site",
  "can_change_visit", "can_see_customer", "can_see_customer_name", "can_see_project", "can_see_site",
  "can_work_on_project", "clear_assignments", "clear_unseen_assignments", "create_workspace", "delete_attachment",
  "delete_task", "delete_visit", "find_invite", "has_workspace_role", "is_on_crew", "is_project_person",
  "join_workspace", "partner_serves_customer", "restore_project",
];

const SYSTEM_SCHEMAS = ["pg_catalog", "information_schema", "pg_toast"];

// `pg` is a dependency of @repo/db, not of the repo root: resolve it from there.
const { Client } = createRequire(new URL("../../packages/db/package.json", import.meta.url))("pg");

/**
 * The failed checks on `client` (empty when all pass). Read-only.
 * @param {{ query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }> }} client
 * @returns {Promise<string[]>}
 */
export async function checkRuntimeRole(client, role = RUNTIME_ROLE) {
  const failures = [];
  const { rows } = await client.query(
    "select current_user::text as current_user, exists (select 1 from pg_roles where rolname = $1) as role_exists",
    [role],
  );
  const { current_user: currentUser, role_exists: roleExists } = rows[0];

  if (currentUser !== role) failures.push(`current_user is "${currentUser}", not "${role}"`);
  if (!roleExists) {
    failures.push(`role "${role}" doesn't exist (migrations not applied?)`);
    return failures;
  }

  const attributes = await client.query(
    `select pg_has_role(session_user, r.oid, 'SET') as login_can_set, r.rolsuper, r.rolbypassrls,
            has_database_privilege(r.oid, current_database(), 'TEMPORARY') as can_temp
     from pg_roles r where r.rolname = $1`,
    [role],
  );
  const { login_can_set: loginCanSet, rolsuper, rolbypassrls, can_temp: canTemp } = attributes.rows[0];
  if (loginCanSet !== true) failures.push(`the login (session_user) can't SET ROLE ${role}`);
  if (rolsuper !== false) failures.push(`${role} is a superuser`);
  if (rolbypassrls !== false) failures.push(`${role} has BYPASSRLS`);
  if (canTemp !== false) failures.push(`${role} has TEMPORARY on the database (migration 0025's REVOKE didn't apply)`);

  const tables = await client.query(
    `select c.relname::text as name,
            pg_has_role($1, c.relowner, 'MEMBER') as role_has_owner,
            c.relrowsecurity as rls
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
     order by c.relname`,
    [role],
  );
  const ownedTables = tables.rows.filter((t) => t.role_has_owner).map((t) => t.name);
  if (ownedTables.length > 0) failures.push(`${role} is a member of the owner of: ${ownedTables.join(", ")}`);
  const withoutRls = tables.rows.filter((t) => !t.rls && !TABLES_WITHOUT_RLS.includes(t.name)).map((t) => t.name);
  if (withoutRls.length > 0) failures.push(`row-level security is off on: ${withoutRls.join(", ")}`);

  // What else app_user can reach that row-level security doesn't cover.
  const reachable = await client.query(
    `select n.nspname::text as schema, c.relname::text as name, c.relkind::text as kind
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where c.relkind in ('r', 'p', 'f', 'v', 'm') and n.nspname <> all ($2)
       and (has_table_privilege($1, c.oid, 'SELECT') or has_table_privilege($1, c.oid, 'INSERT')
            or has_table_privilege($1, c.oid, 'UPDATE') or has_table_privilege($1, c.oid, 'DELETE'))
     order by 1, 2`,
    [role, SYSTEM_SCHEMAS],
  );
  const qualified = (r) => `${r.schema}.${r.name}`;
  const views = reachable.rows.filter((r) => (r.kind === "v" || r.kind === "m") && !(r.schema === "public" && ALLOWED_VIEWS.includes(r.name)));
  if (views.length > 0) failures.push(`views ${role} can use that aren't allowlisted: ${views.map(qualified).join(", ")}`);
  const outside = reachable.rows.filter((r) => ["r", "p", "f"].includes(r.kind) && r.schema !== "public");
  if (outside.length > 0) failures.push(`tables outside public ${role} can use: ${outside.map(qualified).join(", ")}`);

  const definers = await client.query(
    `select distinct n.nspname::text as schema, p.proname::text as name
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where p.prosecdef and n.nspname <> all ($2) and has_function_privilege($1, p.oid, 'EXECUTE')
     order by 1, 2`,
    [role, SYSTEM_SCHEMAS],
  );
  const unknownDefiners = definers.rows.filter((f) => !(f.schema === "public" && ALLOWED_DEFINER_FUNCTIONS.includes(f.name)));
  if (unknownDefiners.length > 0) {
    failures.push(`SECURITY DEFINER functions ${role} can run that aren't allowlisted: ${unknownDefiners.map(qualified).join(", ")}`);
  }

  // The probe, last: an error here aborts a surrounding transaction.
  try {
    const probe = await client.query(
      "select coalesce(current_setting('app.user_id', true), '') as user_id, (select count(*)::int from workspace) as visible",
    );
    const { user_id: userId, visible } = probe.rows[0];
    if (userId !== "") failures.push(`app.user_id is set ("${userId}"), so the probe proves nothing`);
    else if (visible !== 0) failures.push(`without app.user_id, ${currentUser} sees ${visible} workspace row(s), not 0`);
  } catch (error) {
    failures.push(`the workspace probe failed: ${error.message}`);
  }
  return failures;
}

async function main() {
  // The runtime's config, minus the pool-only parts (`onConnect`, `max`): the checks below report more
  // than assertRole's single current_user test.
  const config = buildPoolConfig(process.env);
  const client = new Client(config);
  await client.connect();
  try {
    const { rows } = await client.query("select current_database() as db, session_user::text as login");
    const failures = await checkRuntimeRole(client);
    if (failures.length > 0) {
      console.error(`Runtime role check FAILED on ${rows[0].db} (login ${rows[0].login}):`);
      for (const failure of failures) console.error(`  - ${failure}`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `Runtime role check passed on ${rows[0].db} (login ${rows[0].login}): current_user = ${RUNTIME_ROLE}, no superuser/BYPASSRLS/TEMPORARY, owns no table, RLS on, nothing around it, probe sees no workspace.`,
    );
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Runtime role check FAILED: ${error.message}`);
    process.exitCode = 1;
  });
}
