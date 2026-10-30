# Task 032: Request-scoped session and membership lookups

- **Status:** done
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
- [x] With two memberships that have the same `joinedAt` and no cookie, the same workspace is chosen on every load.
- [x] A dashboard page load makes one session lookup and one membership query (checked with a query counter in a unit test, or by logging during manual verification).

## Approach (brief)
Edit only `features/workspaces/queries.ts`, `current-workspace.ts`, `require-workspace.ts` and `features/auth/require-session.ts`. Server actions keep calling the same helpers, because `cache()` is per request there too.

## Test plan
- Unit: `currentWorkspaceId` with equal `joinedAt`.
- Acceptance: the default-workspace scenario (seeds equal `joinedAt`), tagged `@task:032`.

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.
- 2026-10-30 – Started. Added the scenario "Without a saved choice, every load opens my oldest workspace" (`@task:032`).
- 2026-10-30 – Red: `currentWorkspaceId` picked `ws-b` over `ws-a` when `joinedAt` was equal. The new `require-workspace.test.ts` (a fake db that counts membership queries, with `cache` replaced by a per-test memo) showed 2 session lookups and 3 membership queries for one page load, and an `orderBy` without `workspaceId`. `features/workspaces`: 5 failed, 19 passed.
- 2026-10-30 – Green: `currentSession = cache(getSession)` in `require-session.ts`, used by `requireSession` and `requireWorkspaceForAction`. `listMemberships` is memoized per request through a `cache()`d map, which `ensurePersonalWorkspace` clears so the re-read on a first visit isn't stale. SQL orders by `joinedAt, workspaceId`, and `currentWorkspaceId` breaks ties the same way. Dashboard unit tests 124/124; lint and typecheck clean.
- 2026-10-30 – Acceptance: workspace-switching 8/8. Full suite 100/103: three multi-user scenarios (task-details, workspace-members) hit the 30 s test timeout while the shared machine's load average was 35–125. The base code (`docs/plan-m9`) failed 4 workspace-members scenarios the same way at the same time. With `--workers=1`, workspace-members and task-details pass 17/17 on this branch.
- 2026-10-30 – E2E can't seed two memberships with the same `joinedAt`: the tests have no database access, and every join is its own statement. So the scenario guards the no-cookie default across loads, and the tie itself is covered by the `currentWorkspaceId` unit test and the `orderBy` assertion.
- 2026-10-30 – Stale data in actions: React `cache()` only memoizes inside a server render (outside one, `getCacheForType` gets a new Map on every call). Next runs a server action before it renders the result, so actions (leave, join, create, switch, remove) always query fresh data, and the page rendered afterwards starts with an empty cache. Within a render, the only write followed by a read is `ensurePersonalWorkspace`, which clears the cached entry.
- 2026-10-30 – Merged to `main` in PR #12 (M9). Combined branch: 146/146 e2e, 223 unit tests, lint and typecheck clean. The Storybook build on Node 22 (CI) was fixed in PR #13.

## Parking lot
- Postgres sorts `workspace_id` by the database collation and JS by code unit. Both orders are deterministic, so the default stays stable. In a tie with mixed-case ids, though, the list order on /workspaces could differ from the chosen default. `COLLATE "C"` would align them if that ever matters.
- `requireProjectAccess`, `requireOrganizationAccess` and the notes action still call `getSession()` directly. They run only in server actions, where caching has no effect.
