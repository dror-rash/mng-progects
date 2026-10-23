# Task 013: Due dates and overdue tasks on the home page

- **Status:** todo
- **Milestone:** M6
- **Zone / package:** `apps/dashboard`, `packages/db`
- **Feature file:** `docs/features/task-due-dates.feature`

## Why
Without due dates nobody can tell what's late. The home page should surface what needs attention.

## Scope
- Schema: nullable `task.due_date` of type `date` (a calendar day, no time, so no time-zone shifting).
- Set or clear the due date on the task detail page (native date input).
- Board cards show "Due <date>"; an open task (not Done) whose due date is before today also shows "Overdue" as text.
- Home: "Overdue" and "Due this week" (open tasks due today through 6 days from now) stats.

## Out of scope
- Reminders/notifications, calendar views, recurring tasks, start dates.

## Acceptance criteria
- [ ] Setting a due date shows it on the task page and board card; clearing it removes it.
- [ ] An open task due in the past is marked Overdue; a Done task never is.
- [ ] Home shows overdue and due-this-week counts.

## Approach (brief)
Pure `dueState(dueDate, status, today)` → `"overdue" | "due-soon" | "later" | null`, with `today` passed in. "Today" is the server's UTC date for now, consistent with the time-zone item parked in task 010; revisit with the `timestamptz` ADR.

## Test plan
- Acceptance: `task-due-dates.feature` (3 scenarios). Steps compute dates relative to today with a margin of days, so the UTC/local difference can't flip them.
- Unit: `dueState` boundaries (yesterday, today, +6, +7 days, Done, null).

## Progress log
- 2026-10-23 – Task created.

## Parking lot
- Use the viewer's time zone for "today" once timestamps move to `timestamptz`.
