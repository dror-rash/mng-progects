# Task 037: Drag tasks between board columns

- **Status:** todo
- **Milestone:** M9
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/project-tasks.feature`

## Why
Moving a task today means clicking a "Move to…" button. Dragging the card is what people expect from a board.

## Scope
- Drag a task card to another column to change its status, using the existing `updateTaskStatusAction`.
- The "Move to…" buttons stay, as the keyboard and no-JS path.
- The card moves right away on drop (`useOptimistic`), and goes back to its column if the action fails.

## Out of scope
- Reordering within a column (no position column exists).
- Moving the board to `packages/ui`: no second zone needs it yet.

## Acceptance criteria
- [ ] Dragging a card from To do to In progress moves it, and it stays there after reload.
- [ ] The "Move to" buttons still work.
- [ ] A screen reader announces the move.

## Approach (brief)
Extract the board columns from `app/projects/[projectId]/page.tsx` into a client `features/tasks/task-board.tsx`, and keep the page's other edits minimal (task 030 changes its `AppHeader` props). Choosing a drag library (e.g. `@dnd-kit/core`) is a new dependency: note it in the PR, and add an ADR only if it affects other zones.

## Test plan
- Acceptance: drag scenario with Playwright `dragTo`, tagged `@task:037`.
- Component: `TaskBoard` renders columns and calls the action on drop.
- Storybook: board with tasks in each column, plus the dragging state.

## Progress log
- 2026-10-30 – Drafted from the task 005 parking lot.

## Parking lot
