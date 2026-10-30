# Task 034: Test steps and comment cleanup

- **Status:** in-progress
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
- [ ] No step calls `browser.newContext` outside `fixtures.ts`.
- [ ] `grep -ri ownership apps/dashboard` finds no stale comments.
- [ ] The full e2e suite stays green, and runs with no leftover contexts.

## Approach (brief)
Mechanical. Comment edits in `tasks/queries.ts` may conflict trivially with task 031; resolve by keeping both.

## Test plan
- Acceptance: the full suite.

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.

## Parking lot
