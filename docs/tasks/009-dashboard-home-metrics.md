# Task 009: Dashboard home dedicated to metrics and recent projects

- **Status:** in-progress
- **Milestone:** M5
- **Zone / package:** `apps/dashboard`, `packages/ui`
- **Feature file:** `docs/features/dashboard-home.feature`

## Why
The user wants the home page (`/dashboard`) to be about metrics and statistics plus the most recently started projects. Today it mixes stats with a create form and the full project list.

## Scope
- `/dashboard` (home):
  - Totals: Total Projects, Open Tasks, Completion Rate (kept from task 006).
  - "Tasks by status": one stacked bar (To do / In progress / Done) with a legend showing each count.
  - "Recently started": the 5 newest projects, each with a progress meter and "N of M tasks done"; "View all projects" link.
  - No create form and no full list.
- `/dashboard/projects` ("All projects"): create form + every project with its progress.
- `packages/ui`: `Meter` and `StackedBar` components with stories and tests; chart color tokens (`--chart-1..3`, `--chart-track`) in `theme.css`, light and dark.
- Review follow-ups from task 006 that this rewrite touches: queries in parallel, per-project progress in one pass, `createProjectAction` moves to `features/projects/actions.ts`, shared zone header.

## Out of scope
- Activity this week (task 010; needs a `completed_at` column).
- Hover tooltips beyond the native `title` on chart segments.

## Acceptance criteria
- [ ] Home shows the count of tasks in each status.
- [ ] Home lists only the 5 most recently started projects, newest first, with a "View all projects" link.
- [ ] A recent project shows a progress meter at its completion percentage.
- [ ] All projects page lists every project and creates new ones.
- [ ] Home has no create-project form.

## Approach (brief)
Chart palette: first three categorical slots of the dataviz reference palette (blue, orange, aqua), validated light (#2a78d6, #eb6834, #1baf7a on white) and dark (#3987e5, #d95926, #199e70 on #252525). Aqua is below 3:1 on white, so every segment ships a visible legend label with its count.

## Test plan
- Acceptance: `docs/features/dashboard-home.feature`; existing "creates a new project" scenario moves to `/dashboard/projects` (behavior change, own commit).
- Unit: `summarizeByProject` (one-pass grouping); `Meter` and `StackedBar` component tests.
- Storybook: `Meter` (0, partial, full), `StackedBar` (mixed, single status, empty).

## Progress log
- 2026-10-22 – Task created.

## Parking lot
