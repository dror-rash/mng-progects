# Task 011: Task detail page with description

- **Status:** todo
- **Milestone:** M6
- **Zone / package:** `apps/dashboard`, `packages/db`, `packages/ui`
- **Feature file:** `docs/features/task-details.feature`

## Why
A task is only a title today. People need somewhere to write what the task actually involves and to fix a title without deleting and re-adding it.

## Scope
- Task titles on the board link to `/dashboard/projects/<projectId>/tasks/<taskId>`.
- The detail page shows the title, current status, and description, with a form to edit title and description ("Save changes") and a "Delete task" button that returns to the board.
- Schema: nullable `task.description` (`pnpm db:generate`, commit the migration).
- `packages/ui`: `Textarea` (shadcn) with story and test.
- Owner-only, using the existing `getOwnedProject` / `requireOwnedProject`; a task id from another project or user shows "Task not found".

## Out of scope
- Priority and due dates (012, 013). Rich text / markdown. Comments, attachments, history.

## Acceptance criteria
- [ ] Opening a task from the board shows its detail page.
- [ ] Editing title and description saves and shows them on the detail page; the new title shows on the board.
- [ ] Deleting a task from its page returns to the board without it.
- [ ] Another user's task shows "Task not found".

## Approach (brief)
`features/tasks/queries.ts` gets `getOwnedTask(ownerId, projectId, taskId)`; reuse `parseTaskInput` (new, like `parseProjectInput`) for title/description. Revalidate the board and overviews after changes.

## Test plan
- Acceptance: `task-details.feature` (4 scenarios).
- Unit: `parseTaskInput` (trims, empty title rejected, empty description → null).
- Storybook: `Textarea` (empty, filled, disabled).

## Progress log
- 2026-10-23 – Task created.

## Parking lot
