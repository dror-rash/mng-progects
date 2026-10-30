# Task 035: Home and project counts in SQL

- **Status:** todo
- **Milestone:** M9
- **Zone / package:** `apps/dashboard`
- **Feature file:** `docs/features/dashboard-home.feature`, `docs/features/project-dashboard.feature` (no new scenarios; existing ones must stay green)

## Why
The home page and the projects list load every task row in the workspace to count them in memory. This grows with the workspace.

## Scope
- Home totals, tasks by status, and "activity this week" come from `count(*) FILTER (…)` / `GROUP BY` queries.
- Per-project progress on the projects list and home page comes from one `GROUP BY project_id, status` query.

## Out of scope
- Time zone changes to "this week" (task 041).

## Acceptance criteria
- [ ] The home and projects pages show the same numbers as before for the existing scenarios.
- [ ] Neither page selects individual task rows for counting.

## Approach (brief)
Add count queries in `features/tasks/queries.ts` *below* the existing functions (task 031 edits the ones above), then switch `app/page.tsx` and `app/projects/page.tsx`. Keep `summarizeTasks()` and its tests as the shape both pages consume, so the components don't change.

## Test plan
- Acceptance: the existing home and project dashboard scenarios.
- Unit: mapping grouped rows to the summary shape.

## Progress log
- 2026-10-30 – Drafted from the task 006 and 010 parking lots.

## Parking lot
