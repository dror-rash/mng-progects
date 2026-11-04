#!/usr/bin/env node
// Runtime role check (task 068, ADR-0006): after `db:migrate`, open a connection exactly as the runtime pool
// does (the environment's runtime login, `-c role=app_user` from buildPoolConfig) and fail unless
//   - current_user is app_user, and the login may SET ROLE app_user;
//   - app_user isn't a superuser and hasn't BYPASSRLS;
//   - app_user owns no public table and isn't a member of any table's owner (owners bypass row-level
//     security, which isn't forced);
//   - row-level security is on for every public table except Better Auth's (no RLS by design, ADR-0006);
//   - app_user can't create temporary tables (migration 0025);
//   - app_user can use no view, materialized view or SECURITY DEFINER function but the allowlisted ones
//     (views pinned to the migrations' definition, functions by exact signature), and no table outside
//     public, counting column-only grants (each runs with its owner's rights or has no policies of ours);
//   - app_user has no TRUNCATE, TRIGGER or REFERENCES on any table (TRUNCATE ignores row-level security);
//   - without app.user_id, app_user sees no workspace (the probe: row-level security really applies).
//
// It runs where PR migrations can plant functions (app_preview), so search_path is pinned and catalog calls
// are qualified (pg-safe.mjs): a planted function can't fake a pass.
//
// Usage: DATABASE_URL=postgres://<login>:…@127.0.0.1:5432/<db> node --experimental-strip-types infra/scripts/check-runtime-role.mjs
// (deploy.yml runs it through the Cloud SQL Auth Proxy; CI runs its tests against the migrated database).
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { buildPoolConfig, RUNTIME_ROLE } from "../../packages/db/src/pool-config.ts";
import { Client, pinSearchPath, withPinnedSearchPath } from "./pg-safe.mjs";

/** Better Auth's tables: grants and no row-level security (ADR-0006). Any other public table needs it. */
export const TABLES_WITHOUT_RLS = ["account", "session", "user", "verification"];

/**
 * The views of the migrations (0020, 0028), pinned: sha256 of their options and pg_get_viewdef (read with the
 * pinned search_path, so every name is schema-qualified). A hash, not "does it call its access function": a
 * redefinition can call the function and still return every row (`… or true`). A migration that changes a
 * view must update its hash here; a Postgres upgrade that deparses differently fails safe the same way.
 */
export const ALLOWED_VIEWS = {
  customer_name: "478a4519a010373bdf60a2d8c9bc542b89d9ebd867609dd5f0f754043874ad2c",
  site_choice: "4c1e7434991881a250ab2b3d2747a1a0eef114004a5c97d87a087693b56c37f0",
};

/**
 * The SECURITY DEFINER functions of the migrations that app_user may run, by exact signature (an overload is
 * a different function): the access functions and the actions built on them (ADR-0006). Taken from
 * packages/db/migrations; the trigger functions aren't executable by app_user. A new one fails the deploy
 * until it is added here on purpose.
 */
export const ALLOWED_DEFINER_FUNCTIONS = [
  "public.access_role(text,text)", "public.can_change_attachment(text,text)", "public.can_change_customer(text,text)",
  "public.can_change_project(text,text)", "public.can_change_site(text,text)", "public.can_change_visit(text,text)",
  "public.can_see_customer(text,text)", "public.can_see_customer_name(text,text)", "public.can_see_project(text,text)",
  "public.can_see_site(text,text)", "public.can_work_on_project(text,text)", "public.clear_assignments(text,text)",
  "public.clear_unseen_assignments(text,text)", "public.create_workspace(text,text)", "public.delete_attachment(text)",
  "public.delete_task(text)", "public.delete_visit(text)", "public.find_invite(text)",
  "public.has_workspace_role(text,text,text[])", "public.is_on_crew(text,text)", "public.is_project_person(text,text)",
  "public.join_workspace(text,text)", "public.partner_serves_customer(text,text)", "public.restore_project(text)",
];

const viewHash = (options, definition) => createHash("sha256").update(`${options}\n${definition}`).digest("hex");

const SYSTEM_SCHEMAS = ["pg_catalog", "information_schema", "pg_toast"];

/**
 * The failed checks on `client` (empty when all pass). Read-only.
 * @param {{ query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }> }} client
 * @returns {Promise<string[]>}
 */
export async function checkRuntimeRole(client, role = RUNTIME_ROLE) {
  await pinSearchPath(client);
  const failures = [];
  const { rows } = await client.query(
    `select pg_catalog."current_user"()::text as current_user,
            exists (select 1 from pg_catalog.pg_roles where rolname = $1::text) as role_exists`,
    [role],
  );
  const { current_user: currentUser, role_exists: roleExists } = rows[0];

  if (currentUser !== role) failures.push(`current_user is "${currentUser}", not "${role}"`);
  if (!roleExists) {
    failures.push(`role "${role}" doesn't exist (migrations not applied?)`);
    return failures;
  }

  const attributes = await client.query(
    `select pg_catalog.pg_has_role(pg_catalog."session_user"(), r.oid, 'SET') as login_can_set, r.rolsuper, r.rolbypassrls,
            pg_catalog.has_database_privilege(r.oid, pg_catalog.current_database(), 'TEMPORARY') as can_temp
     from pg_catalog.pg_roles r where r.rolname = $1::text`,
    [role],
  );
  const { login_can_set: loginCanSet, rolsuper, rolbypassrls, can_temp: canTemp } = attributes.rows[0];
  if (loginCanSet !== true) failures.push(`the login (session_user) can't SET ROLE ${role}`);
  if (rolsuper !== false) failures.push(`${role} is a superuser`);
  if (rolbypassrls !== false) failures.push(`${role} has BYPASSRLS`);
  if (canTemp !== false) failures.push(`${role} has TEMPORARY on the database (migration 0025's REVOKE didn't apply)`);

  const tables = await client.query(
    `select c.relname::text as name,
            pg_catalog.pg_has_role($1::text::pg_catalog.name, c.relowner, 'MEMBER') as role_has_owner,
            c.relrowsecurity as rls
     from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
     order by c.relname`,
    [role],
  );
  const ownedTables = tables.rows.filter((t) => t.role_has_owner).map((t) => t.name);
  if (ownedTables.length > 0) failures.push(`${role} is a member of the owner of: ${ownedTables.join(", ")}`);
  const withoutRls = tables.rows.filter((t) => !t.rls && !TABLES_WITHOUT_RLS.includes(t.name)).map((t) => t.name);
  if (withoutRls.length > 0) failures.push(`row-level security is off on: ${withoutRls.join(", ")}`);

  // What else app_user can reach that row-level security doesn't cover, column-only grants included.
  const reachable = await client.query(
    `select n.nspname::text as schema, c.relname::text as name, c.relkind::text as kind,
            pg_catalog.array_to_string(c.reloptions, ',') as options,
            case when c.relkind in ('v', 'm') then pg_catalog.pg_get_viewdef(c.oid) end as definition,
            (c.relkind in ('r', 'p', 'f') and (pg_catalog.has_table_privilege($1::text::pg_catalog.name, c.oid, 'TRUNCATE, TRIGGER, REFERENCES')
              or pg_catalog.has_any_column_privilege($1::text::pg_catalog.name, c.oid, 'REFERENCES'))) as extra_privilege
     from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where c.relkind in ('r', 'p', 'f', 'v', 'm') and n.nspname <> all ($2::text[])
       and (pg_catalog.has_table_privilege($1::text::pg_catalog.name, c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
            or pg_catalog.has_any_column_privilege($1::text::pg_catalog.name, c.oid, 'SELECT, INSERT, UPDATE, REFERENCES'))
     order by 1, 2`,
    [role, SYSTEM_SCHEMAS],
  );
  const qualified = (r) => `${r.schema}.${r.name}`;
  const isView = (r) => r.kind === "v" || r.kind === "m";
  const allowedView = (r) => r.kind === "v" && r.schema === "public" && Object.hasOwn(ALLOWED_VIEWS, r.name);
  const views = reachable.rows.filter((r) => isView(r) && !allowedView(r));
  if (views.length > 0) failures.push(`views ${role} can use that aren't allowlisted: ${views.map(qualified).join(", ")}`);
  for (const view of reachable.rows.filter(allowedView)) {
    if (viewHash(view.options ?? "", view.definition) !== ALLOWED_VIEWS[view.name]) {
      failures.push(`view ${qualified(view)} isn't the migrations' definition (update ALLOWED_VIEWS only for a reviewed migration)`);
    }
  }
  const outside = reachable.rows.filter((r) => !isView(r) && r.schema !== "public");
  if (outside.length > 0) failures.push(`tables outside public ${role} can use: ${outside.map(qualified).join(", ")}`);
  const extra = reachable.rows.filter((r) => r.extra_privilege);
  if (extra.length > 0) failures.push(`${role} has TRUNCATE, TRIGGER or REFERENCES on: ${extra.map(qualified).join(", ")}`);

  const definers = await client.query(
    `select p.oid::pg_catalog.regprocedure::text as signature
     from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where p.prosecdef and n.nspname <> all ($2::text[])
       and pg_catalog.has_function_privilege($1::text::pg_catalog.name, p.oid, 'EXECUTE')
     order by 1`,
    [role, SYSTEM_SCHEMAS],
  );
  const unknownDefiners = definers.rows.map((f) => f.signature).filter((signature) => !ALLOWED_DEFINER_FUNCTIONS.includes(signature));
  if (unknownDefiners.length > 0) {
    failures.push(`SECURITY DEFINER functions ${role} can run that aren't allowlisted: ${unknownDefiners.join(", ")}`);
  }

  // The probe, last: an error here aborts a surrounding transaction.
  try {
    const probe = await client.query(
      `select coalesce(pg_catalog.current_setting('app.user_id', true), '') as user_id,
              (select pg_catalog.count(*)::int from public.workspace) as visible`,
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
  const client = new Client(withPinnedSearchPath(buildPoolConfig(process.env)));
  await client.connect();
  try {
    const { rows } = await client.query('select pg_catalog.current_database() as db, pg_catalog."session_user"()::text as login');
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
