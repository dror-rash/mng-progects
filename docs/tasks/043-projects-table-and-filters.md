# Task 043: Projects table and filters

- **Status:** done
- **Milestone:** unscheduled (requested directly)
- **Zone / package:** `packages/ui`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/project-list.feature`
- **Depends on:** 042 (the create form leaves All projects)

## Why
All projects shows one tile per project. With dozens of projects (the demo seed makes 75) it's hard to scan, compare progress, or find the projects for one customer or the ones that are behind.

## Scope
- All projects shows a **table** by default: name, customer, status, progress ("3 of 8 done" with a meter), overdue tasks, started date.
- A **View** toggle switches between Table and Tiles (the current cards). It's in the URL (`?view=tiles`) and keeps the filters.
- **Filters**, in the URL so a filtered view can be bookmarked or shared:
  - Customer: any, one customer, or "No customer".
  - Status: a project's progress, derived from its tasks (projects have no status field): No tasks, Not started (no task started or done), In progress, Done (every task done).
  - Overdue only: projects with at least one open task due before today.
  - Search: project name contains the text (case-insensitive).
- Changing a select or the checkbox applies it right away; search applies on Enter or the Search button. Works without JavaScript through the Apply button.
- "Clear filters" link, and an empty state when nothing matches.
- `Table` primitives (shadcn) in `packages/ui`, with stories.

## Out of scope
- Sorting by column, pagination (Parking lot).
- The home page and a customer's page keep their tiles.
- An "assigned to me" filter (Parking lot).

## Acceptance criteria
- [x] All projects shows a table with each project's customer, status and progress.
- [x] Tiles shows the cards; the choice and the filters survive switching.
- [x] Filtering by customer, "No customer", status, overdue and search each shows only the matching projects.
- [x] Filters combine, and "Clear filters" shows everything again.
- [x] An unknown filter value in the URL is ignored (shows everything for that filter).

## Approach (brief)
- `features/projects/project-status.ts`: `PROJECT_STATUSES` with parse/label helpers and `projectStatus(counts)` from the per-status task counts.
- `features/projects/project-filters.ts`: `parseProjectFilters(searchParams)` and `filterProjects(rows, filters)`, pure. Filtering runs in memory on the workspace's projects (already loaded for the tiles); move it to SQL with pagination when workspaces get large.
- `countOverdueTasksByProject(workspaceId, today)` in `features/tasks/queries.ts`.
- `ProjectTable` (server component) next to `ProjectList`; a small client island submits the filter form when a select or checkbox changes (`next/form` keeps it a client-side navigation).

## Test plan
- Acceptance: `project-list.feature` (@task:043): table by default, toggle, each filter, combined filters, clear, no match.
- Unit: `projectStatus`, `parseProjectFilters`, `filterProjects`.
- Component: `Table` in `packages/ui` (renders headers and rows); Storybook story.

## Progress log
- 2026-10-31 – Drafted from a direct request ("change the overview for projects to a table view (can be toggle between tiles and table) add filters for customer, status, and additional").
- 2026-10-31 – Started. Feature change in its own commit: "A project card shows its customer" opens `?view=tiles`, since the table is the default.
- 2026-10-31 – Red: the 7 `project-list.feature` scenarios fail; unit tests for `projectStatus` and the filters fail (no modules); `Table` component test fails (no `./table`).
- 2026-10-31 – Green: `project-status.ts` (`PROJECT_STATUSES`; unknown task status counts as to do), `project-filters.ts` (`parseProjectFilters`, `filterParams`, `filterProjects`; a customer outside the workspace, an unknown status or view is ignored), `countOverdueTasksByProject`, `groupStatusCountsByProject` pulled out of `summarizeProjectStatusCounts`. `ProjectTable` (server) and `ProjectFilterForm` (client island, `next/form` GET form; selects and checkbox submit on change). `Table` in `@repo/ui` with test and stories (Default, Empty); Storybook builds.
- 2026-10-31 – `pnpm lint`, `pnpm typecheck` clean; `pnpm test` 248 (dashboard 181, ui 49, auth 13, db 5); full e2e 153/153 (seed steps need `DATABASE_URL` exported in the shell).
- 2026-10-31 – Merged to `main` in PR #16; CI `verify` and `e2e` green.

## Parking lot
- ~~Sort by clicking a column header~~ (done in task 045); pagination or infinite scroll.
- "Assigned to me" filter (projects with open tasks assigned to me).
- Remember the chosen view per user (cookie) instead of only in the URL.
