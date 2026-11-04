#!/usr/bin/env node
// Runtime role check (task 068, ADR-0006): after `db:migrate`, open a connection exactly as the runtime pool
// does (same login, `-c role=app_user` from buildPoolConfig) and fail unless
//   - current_user is app_user,
//   - pg_has_role('app_user', 'MEMBER') is true,
//   - app_user can't create temporary tables (migration 0025 revoked TEMPORARY).
// Row-level security isn't forced, so a runtime that isn't app_user would bypass it.
//
// Usage: DATABASE_URL=postgres://app:…@127.0.0.1:5432/app node --experimental-strip-types infra/scripts/check-runtime-role.mjs
// (deploy.yml runs it through the Cloud SQL Auth Proxy; locally and in CI, against the migrated database).
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { buildPoolConfig, RUNTIME_ROLE } from "../../packages/db/src/pool-config.ts";

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
    "select current_user::text as current_user, session_user::text as session_user, exists (select 1 from pg_roles where rolname = $1) as role_exists",
    [role],
  );
  const { current_user: currentUser, role_exists: roleExists } = rows[0];

  if (currentUser !== role) failures.push(`current_user is "${currentUser}", not "${role}"`);
  if (!roleExists) {
    failures.push(`role "${role}" doesn't exist (migrations not applied?)`);
    return failures;
  }

  const privileges = await client.query(
    "select pg_has_role($1, 'MEMBER') as is_member, has_database_privilege($1, current_database(), 'TEMPORARY') as can_temp",
    [role],
  );
  const { is_member: isMember, can_temp: canTemp } = privileges.rows[0];
  if (isMember !== true) failures.push(`pg_has_role('${role}', 'MEMBER') is false`);
  if (canTemp !== false) failures.push(`${role} has TEMPORARY on the database (migration 0025's REVOKE didn't apply)`);
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
      `Runtime role check passed on ${rows[0].db} (login ${rows[0].login}): current_user = ${RUNTIME_ROLE}, member of it, no TEMPORARY.`,
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
