# Task 031: Assignees, customers and My tasks across workspaces

- **Status:** in-progress
- **Milestone:** M9
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/task-assignees.feature`, `docs/features/task-details.feature`, `docs/features/customer-notes.feature`

## Why
A few reads still trust data that crossed a workspace boundary: a former member can still show as assignee, a task can show a customer from another workspace, and My tasks can be stale or shuffle.

## Scope
- The board and task page show an assignee only if they are still a member of the project's workspace (check membership in the join); otherwise "Unassigned".
- The task page shows a linked customer only if it is in the project's workspace (same rule as its dropdown).
- My tasks is ordered in SQL (due date, undated last, then priority, then created, then id) and is revalidated when a task's assignee, status, due date or priority changes.
- A scenario: My tasks lists tasks from every workspace I'm in, with each workspace's name.
- The note author comes from the session the action already has, without a second `getSession()` lookup in `notes/actions.ts`.

## Out of scope
- Per-request caching of session and membership (task 032).

## Acceptance criteria
- [ ] An assignment that survives a member's removal (seeded directly) shows as "Unassigned" on the board and task page.
- [ ] A task linked to a customer in another workspace (seeded directly) shows "No customer".
- [ ] Two tasks with the same due date and priority keep the same order across reloads.
- [ ] Assigning a task to me, then opening My tasks, shows it without a manual refresh.
- [ ] My tasks shows tasks from two workspaces, each labelled with its workspace.

## Approach (brief)
Edit `features/tasks/queries.ts` (board + `listMyOpenTasks`), `features/tasks/actions.ts` (revalidate `/my-tasks`), the task page's customer lookup, and `organizations/notes/actions.ts`. `byDueThenPriority` stays as the unit-tested rule; mirror it in SQL `orderBy`. Don't touch `features/workspaces/queries.ts` (task 032).

## Test plan
- Acceptance: the scenarios above, tagged `@task:031`. The "seeded directly" cases insert through `@repo/db` in a step, as in the task 026 outside-assignee step.
- Unit: tie-break order in `byDueThenPriority`.

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.
- 2026-10-30 – Started. Scenarios added to `task-assignees.feature` (4) and `task-details.feature` (1), tagged `@task:031`. The note-author change is a refactor covered by the existing "A note shows who wrote it" scenario.

## Parking lot
