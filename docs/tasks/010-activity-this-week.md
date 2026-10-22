# Task 010: Activity this week on the dashboard home

- **Status:** in-review
- **Milestone:** M5
- **Zone / package:** `apps/dashboard`, `packages/db`
- **Feature file:** `docs/features/dashboard-home.feature`

## Why
The user wants the home page to show recent activity: tasks created and completed in the last 7 days.

## Scope
- Add nullable `completed_at` to `task` (`pnpm db:generate`, commit the migration). Set it when a task moves to Done; clear it when it moves out.
- Home shows "Created this week" and "Completed this week" tiles.

## Out of scope
- Backfilling `completed_at` for tasks already Done (they count from now on).
- Per-day charts / history.

## Acceptance criteria
- [x] Creating tasks increases "Created this week".
- [x] Moving a task to Done increases "Completed this week"; moving it back decreases it.

## Approach (brief)
Pure `countThisWeek(tasks, now)` helper with the clock passed in (unit-tested at the 7-day boundary).

## Test plan
- Acceptance: 2 scenarios in `dashboard-home.feature`.
- Unit: 7-day window boundaries; null `completedAt` ignored.

## Progress log
- 2026-10-22 – Task created.
- 2026-10-22 – Migration `0002` adds nullable `task.completed_at`. 2 scenarios red → green (stable over 3 repeats); 4 unit tests. Full suite (36 e2e) green, lint + typecheck clean; screenshot-checked desktop and mobile.

## Parking lot
