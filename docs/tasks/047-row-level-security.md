# Task 047: Row-level security as the second lock

- **Status:** done
- **Milestone:** M12 Partner Access
- **Zone / package:** `packages/db`, `apps/dashboard`, `packages/auth`, `e2e`
- **Feature file:** none (no behaviour change; database tests in `packages/db/src/access.db.test.ts`)
- **Depends on:** task 046, ADR-0006, design `docs/superpowers/specs/2026-10-31-partner-access-design.md`, plan `docs/superpowers/plans/2026-10-31-partner-access.md`

## Why
Task 046 defined who can see and change what once, as SQL functions, and the app's queries call them. A query that forgets the condition would still leak. ADR-0006 makes the database enforce the same rule with row-level security, so a forgotten condition returns nothing instead of another partner's data.

## Scope
- A migration:
  - the `NOLOGIN` role `app_user` (owns nothing), granted to the migrating user;
  - `select, insert, update, delete` on every table (and by default on future ones) for `app_user`;
  - row-level security **enabled** (not forced) on `project`, `task`, `organization`, `organization_contact`, `organization_note`, `partner`, `customer_partner`, `workspace_member`, `workspace_invite` and `workspace`, with policies calling the access functions for `current_setting('app.user_id', true)`;
  - the view `customer_name` (names partners may see);
  - `SECURITY DEFINER` functions `create_workspace`, `join_workspace` and `find_invite`;
  - `EXECUTE` on every access and `SECURITY DEFINER` function revoked from `PUBLIC` and granted to `app_user`.
- `@repo/db`: the runtime pool connects with `-c role=app_user`; `withAccess(userId, fn)` runs `fn` in a transaction that sets `app.user_id`, and `getDb()` returns that transaction inside it; `getPoolDb()` for Better Auth; `schema.customerName`.
- `@repo/db/maintenance`: `getMaintenanceDb()`, a pool without the role, for seeds, e2e fixtures and DB tests only (lint rule keeps it out of app code).
- Every query, `get…ForUser` and action runs inside `withAccess` for the signed-in user. Creating and joining a workspace go through the new functions.
- `pnpm --filter @repo/db test:db` (DB tests, `*.db.test.ts`) locally and in CI's e2e job.

## Out of scope
- Partner companies, assignments and invites in the UI (task 048); the partner experience, including showing partners customer names through `customer_name` (task 049).
- Splitting the production Cloud SQL `app` user into separate owner and runtime login users in Terraform (an open question in the design): the one `app` user migrates as owner and its runtime pool switches to `app_user` on connect.
- Soft delete (task 051).

## Acceptance criteria
- [x] Partner A sees only its own project; partners see no `organization` rows, and only the names of assigned customers through `customer_name`.
- [x] A partner can't update or insert another partner's project; an auditor can't write anything.
- [x] Without `withAccess` the runtime pool sees nothing.
- [x] Unassigning a customer hides the partner's project at once.
- [x] A partner sees the members of their own partner and the admins only.
- [x] Eight parallel `withAccess` queries finish with a pool of five.
- [x] Every existing acceptance scenario still passes (no behaviour change).

## Approach (brief)
- `withAccess` keeps the transaction in an `AsyncLocalStorage`; a nested call for the same user reuses it, a nested call for another user throws. Actions read the session before opening the transaction (so a request never holds two connections) and redirect after it commits (`redirect()` throws, which would roll it back).
- RLS is enabled, not forced (controller ruling 9): `app_user` owns nothing, so policies apply to it; the owner (migrations, the maintenance connection, and the `SECURITY DEFINER` access functions) bypasses them, so a future data migration can't silently do nothing.
- Insert and update checks on `project` and `organization` look at the new row inline (the access functions read the table, where the new row isn't visible yet).
- Better Auth keeps the pool it was created with (`getPoolDb()`), never a `withAccess` transaction; its tables have grants and no RLS.

## Test plan
- Database: `packages/db/src/access.db.test.ts` (the ten cases of the brief, plus: no writes through `customer_name`; nested `withAccess` reuses the transaction, refuses another user; parallel calls get their own) against the migrated database, as the runtime pool.
- Unit: `pool-config.test.ts` covers the role option on both branches (DATABASE_URL and Cloud SQL) and the maintenance config without it.
- Acceptance: the full suite, unchanged.

## Progress log
- 2026-10-31 – Drafted from the M12 plan (task 047 brief) and the controller's rulings 2 (create/join through `SECURITY DEFINER` functions), 9 (enable, don't force), 10 (revoke `EXECUTE` from `PUBLIC`), 11 (Better Auth unaffected).
- 2026-10-31 – Red: `pnpm --filter @repo/db test:db` fails (no `./maintenance`, no `withAccess`); `pool-config.test.ts` fails on both branches (no `options`).
- 2026-10-31 – Migration 0020 (custom: role, grants, policies, `customer_name`, `has_workspace_role`, `create_workspace`, `find_invite`, `join_workspace`, `EXECUTE` grants). `withAccess`, `getPoolDb`, `@repo/db/maintenance`; DB tests 14/14 green. Insert/update checks on `project` and `organization` use the new row inline (the functions can't see it); `customer_name` is read only for `app_user` (default privileges would grant writes, which would bypass `organization`'s policies).
- 2026-10-31 – Switch-over: every query takes the acting user and runs in `withAccess`; actions read the session first (`requireActionSession`), do their work in one transaction and redirect after it; `requireProjectAccess` / `requireOrganizationAccess` take the user id. Personal workspaces are created once per user under an advisory lock (`create_workspace` makes random ids). Leaving clears your assignments before the membership goes (afterwards the task policy refuses). Better Auth uses `getPoolDb()`; seeds and e2e fixtures use `getMaintenanceDb()`; lint rule for the rest.
- 2026-10-31 – `pnpm lint`, `pnpm typecheck` clean; `pnpm test` 287 (dashboard 215, ui 51, auth 13, db 8); `pnpm --filter @repo/db test:db` 14/14; full e2e 166/166 (no behaviour change).

## Parking lot
- Partners get `null` customer names in project lists: `selectWithCustomer` and `listProjectTasks` join `organization`, which partners can't read. Switch them to `customer_name` with the partner experience (task 049).
- An auditor leaving keeps their task assignments (they can't update tasks; the assignee shows as none once they're gone). Moot once auditors can't be assigned (task 049); otherwise clear them in a `SECURITY DEFINER` function.
- A partner's member counts on `/workspaces` count only the members they can see.
- `ALTER DEFAULT PRIVILEGES … REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`, so a future access function can't be forgotten.
- Policies and predicates both call the access functions per row; check the largest lists with `EXPLAIN` (ADR-0006).
