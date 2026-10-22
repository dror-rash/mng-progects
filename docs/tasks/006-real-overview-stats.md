# Task 006: Real overview stats and project progress

- **Status:** todo
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
- [ ] Overview shows correct open-task count and completion rate for the signed-in user's tasks.
- [ ] A project card shows how many of its tasks are done.

## Approach (brief)
Pure `projectProgress()` helper in `features/tasks/task-status.ts` (unit-tested), one owner-scoped aggregate query.

## Test plan
- Acceptance: new scenarios in `project-dashboard.feature`.
- Unit: progress/completion-rate math, including zero tasks.

## Progress log
- 2026-10-22 – Task created.

## Parking lot
