# Task 032: Request-scoped session and membership lookups

- **Status:** todo
- **Milestone:** M9
- **Zone / package:** `apps/dashboard`
- **Feature file:** `docs/features/workspace-switching.feature` (default workspace scenario only)

## Why
A single page load looks up the session and memberships several times. With two memberships joined in the same instant, the default workspace can also flip between loads.

## Scope
- Wrap the session and `listMemberships(userId)` lookups in React `cache()` so each runs once per request.
- Order memberships by `joinedAt`, then `workspaceId`, both in SQL and in `currentWorkspaceId`, so the default is stable.

## Out of scope
- Any change to what is checked (rules stay as in ADR-0005).

## Acceptance criteria
- [ ] With two memberships that have the same `joinedAt` and no cookie, the same workspace is chosen on every load.
- [ ] A dashboard page load makes one session lookup and one membership query (checked with a query counter in a unit test, or by logging during manual verification).

## Approach (brief)
Edit only `features/workspaces/queries.ts`, `current-workspace.ts`, `require-workspace.ts` and `features/auth/require-session.ts`. Server actions keep calling the same helpers, because `cache()` is per request there too.

## Test plan
- Unit: `currentWorkspaceId` with equal `joinedAt`.
- Acceptance: the default-workspace scenario (seeds equal `joinedAt`), tagged `@task:032`.

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.

## Parking lot
