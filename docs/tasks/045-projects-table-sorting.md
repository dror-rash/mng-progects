# Task 045: Sort the projects table by column

- **Status:** done
- **Milestone:** unscheduled (requested directly; parking lot of task 043)
- **Zone / package:** `packages/ui`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/project-list.feature`
- **Depends on:** 043

## Why
The projects table is always newest first. To find the projects that are furthest behind, or to read them by customer, you need to sort by that column.

## Scope
- Every column header of the projects table is a link that sorts by it: Project, Customer, Status, Progress, Overdue, Started.
- The first click sorts in the column's natural direction (A→Z for Project and Customer, No tasks→Done for Status, highest first for Progress and Overdue, newest first for Started); clicking the sorted column again reverses it.
- The sorted header shows an arrow and has `aria-sort`.
- The sort is in the URL (`sort`, `dir`), so it can be bookmarked; the default (Started, newest first) is left out. Filters, Clear filters and the view toggle keep it; tiles use the same order.
- Projects without a customer go last when sorting by Customer, either direction.
- An unknown `sort` or `dir` is ignored.
- `TableSortIndicator` in `packages/ui`, with a story.

## Out of scope
- Sorting by more than one column.
- Pagination (Parking lot of 043).

## Acceptance criteria
- [x] Clicking a header sorts by it; clicking it again reverses it.
- [x] Sorting by Customer puts projects without one last.
- [x] Sorting by Progress puts the furthest-along project first.
- [x] The sort survives searching and switching to tiles and back.
- [x] An unknown sort in the URL shows the default order.

## Approach (brief)
- `features/projects/project-sort.ts`: `PROJECT_SORTS` (column, label, first direction), `parseProjectSort(params)`, `sortParams(sort)`, `nextSort(current, column)`, `sortProjects(rows, sort)` (stable, so ties stay newest first).
- The page adds `progress` (completion rate) and the sort to its rows, sorts after filtering, and passes the sort to `ProjectTable` and `ProjectFilterForm` (hidden inputs).

## Test plan
- Acceptance: `@task:045` scenarios in `project-list.feature`.
- Unit: `parseProjectSort`, `nextSort`, `sortProjects`.
- Component: `TableSortIndicator` (renders the direction, hidden from screen readers).

## Progress log
- 2026-10-31 – Drafted from a direct request ("add column sorting to the projects table").
- 2026-10-31 – Red: the five `@task:045` scenarios fail (no sortable headers); `project-sort` unit tests fail (no module); `TableSortIndicator` tests fail (not exported).
- 2026-10-31 – Green: `project-sort.ts` (`PROJECT_SORTS`, `parseProjectSort`, `sortParams`, `nextSort`, `sortProjects`); `ProjectTable` headers are links with `aria-sort` and `TableSortIndicator`; the page sorts after filtering and every link (view, Clear filters, headers) and the filter form's hidden fields keep the sort. `TableSortIndicator` in `@repo/ui` with stories (Sorted ascending / descending); Storybook builds.
- 2026-10-31 – `pnpm lint`, `pnpm typecheck` clean; `pnpm test` 274 (dashboard 205, ui 51, auth 13, db 5); full e2e 160/160.

## Parking lot
