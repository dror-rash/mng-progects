# Task 018: Task priority

- **Status:** in-review
- **Milestone:** M7
- **Zone / package:** `apps/dashboard`, `packages/ui`
- **Feature file:** `docs/features/task-priority.feature`

## Why
Not every task is equally urgent. The `task.priority` column already exists (default `medium`) but nothing shows or changes it.

## Scope
- Priorities Low / Medium / High defined once in `features/tasks/task-priority.ts` (same pattern as `task-status.ts`).
- Set priority on the task detail page.
- Board cards show a priority label as text (not color alone); within each column, tasks sort High → Medium → Low, then oldest first.
- Uses `NativeSelect` from task 013.

## Out of scope
- Custom priority levels. Drag-and-drop ordering.

## Acceptance criteria
- [x] Changing a task's priority shows the new priority on its page and its board card.
- [x] Within a column, high-priority tasks are listed first.

## Approach (brief)
`parseTaskPriority` + `comparePriority` pure helpers; unknown stored values treated as Medium (like unknown statuses → To do). No migration needed.

## Test plan
- Acceptance: `task-priority.feature` (2 scenarios).
- Unit: parsing, ordering, unknown value fallback.
- Storybook: none new.

## Progress log
- 2026-10-23 – Task created.
- 2026-10-26 – 2 scenarios red → green (stable over 3 repeats); priority helpers and parsing unit-tested. Board cards label only High and Low (Medium is the default; labelling every card would be noise) — my call. Priority select keyed like the other selects. Full suite 71/71.

## Parking lot
