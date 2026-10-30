# Task 034: Test steps and comment cleanup

- **Status:** done
- **Milestone:** M9
- **Zone / package:** `e2e`, `apps/dashboard` (comments only)
- **Feature file:** none (no behavior change)

## Why
Older "another user has…" steps open browser contexts by hand, outside the `people` fixture, so the contexts aren't closed. Several comments still talk about "ownership" from before workspaces existed.

## Scope
- Move "another user has a customer named…", "another user has a project named…" and "another user has a project … with a task …" (`customers.steps.ts`, `project-tasks.steps.ts`) to `people.newPerson()` + `signUp`.
- Reword the stale "ownership" comments (`organizations/contacts/queries.ts`, `tasks/queries.ts`, `tasks/task-input.ts`) to "workspace access" (ADR-0005).

## Out of scope
- New scenarios.

## Acceptance criteria
- [x] No step calls `browser.newContext` outside `fixtures.ts`.
- [x] `grep -ri ownership apps/dashboard` finds no stale comments.
- [x] The full e2e suite stays green, and runs with no leftover contexts.

## Approach (brief)
Mechanical. Comment edits in `tasks/queries.ts` may conflict trivially with task 031; resolve by keeping both.

## Test plan
- Acceptance: the full suite.

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.
- 2026-10-30 – No behavior change, so no red run: the existing scenarios are the safety net.
  - `test(e2e)`: "another user has a customer named" and "another user has a project named" now use `people.newPerson()` + `signUp` (the "project … with a task …" step already did). Step text unchanged; no feature file touched. `customers.steps.ts` imports `origin` from `fixtures.ts` instead of redefining it. `grep -rn newContext e2e/steps` finds only `fixtures.ts`.
  - `chore(dashboard)`: comments only, in `contacts/queries.ts`, `tasks/queries.ts` (the `getProjectTask` doc comment only), `tasks/task-input.ts`, and also `projects/project-input.ts` ("callers check the user owns it"). `ownerId` writes in the actions are "created by" and stay.
  - Results: affected features (customers, project-tasks, task-details, project-settings, customer-links) 34/34; full suite 102/102 (97 on the first run; 5 timeouts in customer-contacts and workspace-members, which don't use the changed steps, passed on rerun 14/14 under lower machine load). Unit 159 passed; lint and typecheck clean.
- 2026-10-30 – Merged to `main` in PR #12 (M9). Combined branch: 146/146 e2e, 223 unit tests, lint and typecheck clean. The Storybook build on Node 22 (CI) was fixed in PR #13.

## Parking lot
- `e2e/scripts/screenshots.mjs` still calls `browser.newContext` itself; it is a standalone script, not a step, so it is out of this task's scope.
