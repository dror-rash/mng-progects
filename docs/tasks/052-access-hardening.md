# Task 052: Access hardening after the final review of M12

- **Status:** in-progress
- **Milestone:** M12 Partner Access (fix wave)
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/partner-access.feature`, `docs/features/task-assignees.feature`
- **Depends on:** tasks 046–051, ADR-0006, design `docs/superpowers/specs/2026-10-31-partner-access-design.md` (rule 7: auditors are never assignable; rule 8c), review findings `.superpowers/sdd/2026-10-31-partner-access/final-findings.md`

## Why
The final whole-milestone review of M12 found no partner-to-partner leak through the app, but: a way to bypass row-level security entirely for anyone who can run SQL as `app_user` (temp tables shadowing `workspace_member` inside the `SECURITY DEFINER` functions), an unverified production assumption (the runtime is `app_user` only because of a startup option), a data-loss case (demoting an admin to auditor keeps their assignments, and the next save of such a task wipes the assignee), and gaps in the leak suite that let some negative checks pass vacuously.

## Scope
1. Migration 0025: every `SECURITY DEFINER` function in `public` gets `search_path = public, pg_temp` (enumerated from `pg_proc`, so none is missed); `TEMPORARY` on the database is revoked from `PUBLIC`.
2. The runtime pool asserts `current_user = 'app_user'` on every new connection (`onConnect`, fail closed); the maintenance pool doesn't.
3. Demoting someone to auditor clears all their assignments in the workspace (`clear_unseen_assignments`); the edit-task form doesn't post `assigneeId` while the current assignee isn't one of the choices (like `customerHidden`, task 050).
4. `assignable()` / `isAssignable` leave out a deleted partner's users.
5. Leak suite: "the task … does not show …" first finds the card; the not-found comparison checks the real record's status too (404); the page-source check asserts the re-fetch landed on the same URL.
6. DB tests: `create_workspace` / `join_workspace` refuse another user; `join_workspace` refuses revoked and expired invites.
7. Coverage guards (DB tests): every table in `public` has row-level security except the Better Auth tables; no `SECURITY DEFINER` function in `public` is executable by `PUBLIC`.
8. Docs: why a partner's soft delete of a project passes the policies (`can_see_project` reads the pre-update snapshot).

## Out of scope
- FORCE row-level security / a separate login user for the runtime (ADR-0006 ruling 9 stands; item 2 is its precondition).
- Anything else noticed goes in the Parking lot.

## Acceptance criteria
- [ ] As `app_user`, a temp table named `workspace_member` with a fake admin row exposes nothing (creating it is refused).
- [ ] A pooled connection that isn't `app_user` never serves a query.
- [ ] Making an admin an auditor clears their assignments (`task-assignees.feature`).
- [ ] Saving a task keeps an assignee who isn't one of the choices (`task-assignees.feature`).
- [ ] A deleted partner's users can't be assigned (`partner-access.feature`).
- [ ] The leak suite's negative steps can't pass vacuously.
- [ ] Guards for definer functions, RLS coverage and function grants pass.

## Approach (brief)
- Migration 0025 (custom SQL): `CREATE OR REPLACE clear_unseen_assignments` (auditor: clear all), then a `DO` loop `ALTER FUNCTION … SET search_path = public, pg_temp` over `pg_proc` where `prosecdef`, then `REVOKE TEMPORARY ON DATABASE <current_database()> FROM PUBLIC` (and from `app_user`).
- `buildPoolConfig` adds `onConnect: assertRole` when a role is set (pg-pool ends the client and fails the checkout when it rejects).
- ADR-0006 amendment (2026-11-01).

## Test plan
- DB: `packages/db/src/hardening.db.test.ts` (shadowing attack, guards, coverage); `access.db.test.ts` (demotion to auditor); runtime pool is `app_user`, a pool without the role refuses queries.
- Unit: `pool-config.test.ts` (`onConnect`); `edit-task-form.test.tsx` (hidden assignee).
- Acceptance: `@task:052` scenarios in `task-assignees.feature` and `partner-access.feature`; tightened leak-suite steps.

## Progress log
- 2026-11-01 – Drafted from the final review findings (items 1–8).

## Parking lot
