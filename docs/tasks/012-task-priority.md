# Task 012: Task priority

- **Status:** todo
- **Milestone:** M6
- **Zone / package:** `apps/dashboard`, `packages/ui`
- **Feature file:** `docs/features/task-priority.feature`

## Why
Not every task is equally urgent. The `task.priority` column already exists (default `medium`) but nothing shows or changes it.

## Scope
- Priorities Low / Medium / High defined once in `features/tasks/task-priority.ts` (same pattern as `task-status.ts`).
- Set priority on the task detail page.
- Board cards show a priority label as text (not color alone); within each column, tasks sort High → Medium → Low, then oldest first.
- `packages/ui`: `NativeSelect` (shadcn native-select pattern, server-renderable) with story and test.

## Out of scope
- Custom priority levels. Drag-and-drop ordering.

## Acceptance criteria
- [ ] Changing a task's priority shows the new priority on its page and its board card.
- [ ] Within a column, high-priority tasks are listed first.

## Approach (brief)
`parseTaskPriority` + `comparePriority` pure helpers; unknown stored values treated as Medium (like unknown statuses → To do). No migration needed.

## Test plan
- Acceptance: `task-priority.feature` (2 scenarios).
- Unit: parsing, ordering, unknown value fallback.
- Storybook: `NativeSelect` (default, with value, disabled).

## Progress log
- 2026-10-23 – Task created.

## Parking lot
