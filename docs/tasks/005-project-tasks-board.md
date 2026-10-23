# Task 005: Project page with a task board

- **Status:** done
- **Milestone:** M4
- **Zone / package:** `apps/dashboard`
- **Feature file:** `docs/features/project-tasks.feature`

## Why
Projects are only a list today; the `task` table exists but nothing uses it. Users need to open a project, add tasks, and move them through To do → In progress → Done — the core of a project management app.

## Scope
- Project names on `/dashboard` link to a project page at `/dashboard/projects/<id>`.
- Project page shows the project name/description and a three-column board: To do, In progress, Done.
- Add a task (title) to a project; it lands in To do.
- Move a task to another status with plain form buttons (no client JS needed).
- Delete a task.
- Only the project owner can see or change a project and its tasks; anything else shows "Project not found".
- Task statuses and board grouping live in `apps/dashboard/features/tasks/` so later features (priority, due dates, assignees) extend one place.
- Add Vitest to `apps/dashboard` for unit tests of pure task logic.

## Out of scope
- Task priority, description, due date, assignee (column `priority` already exists; not shown yet).
- Drag-and-drop reordering.
- Editing/deleting projects (task 007), real overview stats (task 006).

## Acceptance criteria
- [x] Opening a project from the dashboard shows its board with To do, In progress, Done columns.
- [x] Adding a task puts it in To do.
- [x] A task can be moved to In progress and then to Done.
- [x] A task can be deleted.
- [x] Another user's project shows "Project not found".

## Approach (brief)
1. Feature file + step definitions; confirm red.
2. Unit-test pure helpers in `features/tasks/task-status.ts` (status list/labels, parsing, grouping).
3. `features/tasks/queries.ts` (owner-scoped reads) and `features/tasks/actions.ts` (server actions that re-check ownership via `getSession()`).
4. `app/projects/[projectId]/page.tsx` (Server Component) + `not-found.tsx`; link project cards to it.

## Test plan
- Acceptance: `docs/features/project-tasks.feature` (5 scenarios).
- Unit: status parsing rejects unknown values; grouping keeps every status column, even empty ones.
- Storybook: no new `packages/ui` components (board is zone-specific markup on existing Card/Button/Input).

## Progress log
- 2026-10-22 – Task created for M4.
- 2026-10-22 – 5 acceptance scenarios red → green; 6 unit tests for task statuses; full suite (19 e2e) green, lint + typecheck clean.
- 2026-10-22 – Merged in PR #1.

## Parking lot
- Task priority/due date/description/assignee.
- Drag-and-drop between columns.
- Extract a `Board` component to `packages/ui` once a second zone needs it.
