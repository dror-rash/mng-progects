# Task 037: Drag tasks between board columns

- **Status:** in-review
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
- [x] Dragging a card from To do to In progress moves it, and it stays there after reload.
- [x] The "Move to" buttons still work.
- [x] A screen reader announces the move.

## Approach (brief)
Extract the board columns from `app/projects/[projectId]/page.tsx` into a client `features/tasks/task-board.tsx`, and keep the page's other edits minimal (task 030 changes its `AppHeader` props). Choosing a drag library (e.g. `@dnd-kit/core`) is a new dependency: note it in the PR, and add an ADR only if it affects other zones.

## Test plan
- Acceptance: drag scenario with Playwright `dragTo`, tagged `@task:037`.
- Component: `TaskBoard` renders columns and calls the action on drop.
- Storybook: board with tasks in each column, plus the dragging state.

## Progress log
- 2026-10-30 – Drafted from the task 005 parking lot.
- 2026-10-30 – Scenario "Drag a task to another column" (`@task:037`) red (no drag handle) → green; stable over 3 repeats of `project-tasks` (18/18). `TaskBoard` component tests red (module missing) → green, 4 tests: columns and move buttons, keyboard drag saves and announces, failed save puts the card back with an alert, drop on own column does nothing. Full e2e suite 103/103; unit 163 (dashboard 123); lint and typecheck clean.
  - Board columns moved from `app/projects/[projectId]/page.tsx` into the client island `features/tasks/task-board.tsx`; the page still loads data and passes only the card fields plus the two server actions. "Move to" buttons are unchanged server-action forms (no-JS path).
  - New dependency `@dnd-kit/core` (dashboard only, so no ADR). Drag starts from a handle button ("Drag <title>"), shown once hydrated; pointer (5px activation) and keyboard sensors; arrow keys jump between columns; dnd-kit's live region announces pick-up, column, drop and cancel.
  - Optimistic move with `useOptimistic`; if the action throws, the card returns and a `role="alert"` message says so (my call: a silent snap-back is confusing).
  - Dashboard Vitest now runs jsdom component tests (`*.test.tsx`, opt-in per file). The `packages/ui` Storybook also loads dashboard feature stories (`@` alias, automatic JSX, Tailwind `@source`). Stories: tasks in each column, empty columns, dragging, move failed; axe shows no violations.

## Parking lot
- The theme has no `--color-card`, so `bg-card` on `Card` is transparent everywhere; the dragged card uses `bg-background` instead.
- Touch dragging: the pointer sensor works with touch, but there is no long-press delay, so a swipe on a handle drags rather than scrolls.
