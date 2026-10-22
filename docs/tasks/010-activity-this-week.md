# Task 010: Activity this week on the dashboard home

- **Status:** in-review
- **Milestone:** M5
- **Zone / package:** `apps/dashboard`, `packages/db`
- **Feature file:** `docs/features/dashboard-home.feature`

## Why
The user wants the home page to show recent activity: tasks created and completed in the last 7 days.

## Scope
- Backfill (migration `0003`): tasks already Done get `completed_at = updated_at` (only status changes touch `updated_at`).
- Add nullable `completed_at` to `task` (`pnpm db:generate`, commit the migration). Set it when a task moves to Done; clear it when it moves out.
- Home shows "Created this week" and "Completed this week" tiles.

## Out of scope
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
- 2026-10-22 – Review fixes: keep the original completion time on a repeated Done; no upper bound on the 7-day window (DB/app clock skew); backfill migration; refresh `/projects` after every change; `StackedBar` supports 5 validated colors and rejects more.

## Parking lot
- From review of PR #2:
  - Timestamps are `timestamp` without time zone across the schema, while `defaultNow()` uses the DB session time zone. This is fine while Postgres runs in UTC (local Docker, Cloud SQL default). Moving to `timestamptz` is schema-wide and needs its own task + ADR.
  - Compute home counts in SQL (`count(*) FILTER` / `GROUP BY`) instead of loading every task row.
  - "Started" dates are formatted in the server's locale and time zone; format on the client or with the user's time zone.
  - "This week" means a rolling seven days (the option chosen), and the hints say so. Revisit if users expect a calendar week.
