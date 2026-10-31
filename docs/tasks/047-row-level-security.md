# Task 047: Row-level security as the second lock

- **Status:** in-progress
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
- Splitting the production Cloud SQL `app` user into owner and runtime users in Terraform (the runtime pool switches to `app_user` with `SET ROLE` semantics; see ADR-0006).
- Soft delete (task 051).

## Acceptance criteria
- [ ] Partner A sees only its own project; partners see no `organization` rows, and only the names of assigned customers through `customer_name`.
- [ ] A partner can't update or insert another partner's project; an auditor can't write anything.
- [ ] Without `withAccess` the runtime pool sees nothing.
- [ ] Unassigning a customer hides the partner's project at once.
- [ ] A partner sees the members of their own partner and the admins only.
- [ ] Eight parallel `withAccess` queries finish with a pool of five.
- [ ] Every existing acceptance scenario still passes (no behaviour change).

## Approach (brief)
- `withAccess` keeps the transaction in an `AsyncLocalStorage`; a nested call for the same user reuses it, a nested call for another user throws. Actions read the session before opening the transaction (so a request never holds two connections) and redirect after it commits (`redirect()` throws, which would roll it back).
- RLS is enabled, not forced (controller ruling 9): `app_user` owns nothing, so policies apply to it; the owner (migrations, the maintenance connection, and the `SECURITY DEFINER` access functions) bypasses them, so a future data migration can't silently do nothing.
- Insert and update checks on `project` and `organization` look at the new row inline (the access functions read the table, where the new row isn't visible yet).
- Better Auth keeps the pool it was created with (`getPoolDb()`), never a `withAccess` transaction; its tables have grants and no RLS.

## Test plan
- Database: `packages/db/src/access.db.test.ts` (the ten cases of the brief) against the migrated local database, as the runtime pool.
- Unit: `pool-config.test.ts` covers the role option on both branches (DATABASE_URL and Cloud SQL) and the maintenance config without it; `withAccess` nesting.
- Acceptance: the full suite, unchanged.

## Progress log
- 2026-10-31 – Drafted from the M12 plan (task 047 brief) and the controller's rulings 2 (create/join through `SECURITY DEFINER` functions), 9 (enable, don't force), 10 (revoke `EXECUTE` from `PUBLIC`), 11 (Better Auth unaffected).

## Parking lot
