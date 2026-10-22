# Task 006: Real overview stats and project progress

- **Status:** in-review
- **Milestone:** M4
- **Zone / package:** `apps/dashboard`
- **Feature file:** `docs/features/project-dashboard.feature`

## Why
The dashboard overview shows placeholder numbers ("Sprint Status: Active", "Team Velocity: 100%"). Users need real numbers: projects, open tasks, and how much is done.

## Scope
- Replace placeholder cards with: total projects, open tasks (not done), completion rate across all tasks.
- Each project card shows its task progress (e.g. "2 of 5 done").

## Out of scope
- Charts, history, velocity over time.

## Acceptance criteria
- [x] Overview shows correct open-task count and completion rate for the signed-in user's tasks.
- [x] A project card shows how many of its tasks are done.

## Approach (brief)
Pure `summarizeTasks()` helper in `features/tasks/progress.ts` (unit-tested); one owner-scoped query `listOwnedTaskStatuses()` feeds both the overview and per-project progress.

## Test plan
- Acceptance: new scenarios in `project-dashboard.feature`.
- Unit: progress/completion-rate math, including zero tasks.

## Progress log
- 2026-10-22 – Task created.
- 2026-10-22 – 3 acceptance scenarios red → green; 3 unit tests; fixed a flaky step (navigation could cancel a pending task save). Full suite (22 e2e) green, lint + typecheck clean.

## Parking lot
- From review: run the projects and task-status queries in parallel (`Promise.all`); build per-project progress in one pass (Map) instead of filtering per project; move `createProjectAction` into `features/projects/actions.ts`; share the zone header between pages.
- Do the per-project counts in SQL (`GROUP BY`) if task volume grows; today they are computed in memory from one query.
