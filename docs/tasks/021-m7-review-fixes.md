# Task 021: M7 review fixes

- **Status:** in-progress
- **Milestone:** M7
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/task-due-dates.feature`

## Why
`/venice-review` of `feat/m7-task-details` (2026-10-26) found a crash on out-of-range due dates and an untested UTC display path.

## Scope
- Due dates outside 1900–2999 are rejected as "Enter a valid date" (Postgres refuses year 0; typo years like 0026 were stored); the date input gets `min`/`max`. `parseDueDate` returns a typed result instead of an "invalid" string.
- Unit tests for UTC display (`formatDueDate`, `todayUtc`), leap days, year ends, whitespace input, and error order.
- Board: a space before "Overdue" for screen readers; the year shows when the due date isn't in the current year.
- Edit form: a restored priority is validated; errors that belong to no field show at the top of the form, not under Title.
- One `normalizeTaskPriority` for the "unknown → Medium" rule.
- Home: one clock read; clearer "due within seven days, including today" hint; the fifth tile spans the row on mid-size screens.
- e2e: each date step computes its date once; stat checks match the number exactly; shared open/save helpers.
- Docs: plan status, task 018 wording (High/Low-only labels confirmed by the user), CLAUDE.md conventions.

## Out of scope (parking lot)
- Monday ticket (none linked).
- An unknown stored priority shows as Medium and the next save writes "medium" (documented fallback).

## Acceptance criteria
- [ ] An overdue task's own page says it's overdue.
- [ ] Out-of-range dates show a field error instead of failing.

## Progress log
- 2026-10-26 – Task created from the review.
