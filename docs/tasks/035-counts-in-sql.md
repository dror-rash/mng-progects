# Task 035: Home and project counts in SQL

- **Status:** done
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
- [x] The home and projects pages show the same numbers as before for the existing scenarios.
- [x] Neither page selects individual task rows for counting.

## Approach (brief)
Add count queries in `features/tasks/queries.ts` *below* the existing functions (task 031 edits the ones above), then switch `app/page.tsx` and `app/projects/page.tsx`. Keep `summarizeTasks()` and its tests as the shape both pages consume, so the components don't change.

## Test plan
- Acceptance: the existing home and project dashboard scenarios.
- Unit: mapping grouped rows to the summary shape.

## Progress log
- 2026-10-30 – Drafted from the task 006 and 010 parking lots.
- 2026-10-30 – Started. No new scenarios: behavior is unchanged, so the existing `dashboard-home.feature` and `project-dashboard.feature` scenarios are the acceptance tests.
- 2026-10-30 – Red: 13 new unit tests (grouped rows → `TaskSummary`, home overview, window dates) failed (missing `overview` module and `summarize*StatusCounts`). Green: `countWorkspaceOverview` (one `count(*) FILTER (…)` query grouped by status: totals, overdue, due soon, created/completed since a rolling seven days) and `countTasksByProjectAndStatus` (`GROUP BY project_id, status`) appended to `tasks/queries.ts`; home, projects list and customer page use them. Same rules as before: "this week" is `>= now − 7 days` with no upper bound, timestamps bound through their column (UTC); due dates compared as strings against `todayUtc()`; Done never overdue; unknown statuses open / in To do. `summarizeTasks` kept (now built on the counts). Refactor removed the now-unused `listWorkspaceTaskStatuses`, `summarizeByProject` and `countThisWeek`. `@repo/db` exports `gte`, `lt`, `lte`, `SQL`. Unit 127 (dashboard), lint + typecheck clean. Full e2e 101/102; the one failure (task-details cross-user scenario, 30s timeout under machine load) passed on rerun (6/6). Customer-contacts timed out twice under load and also passed on rerun (3/3, same as on the base commit).
- 2026-10-30 – Merged to `main` in PR #12 (M9). Combined branch: 146/146 e2e, 223 unit tests, lint and typecheck clean. The Storybook build on Node 22 (CI) was fixed in PR #13.

## Parking lot
