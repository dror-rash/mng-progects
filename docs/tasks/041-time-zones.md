# Task 041: Time zones (timestamptz and the viewer's time zone)

- **Status:** blocked (needs ADR-0007 accepted)
- **Milestone:** unscheduled (moved out of M9 when it closed)
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/task-due-dates.feature`, `docs/features/customer-notes.feature`, `docs/features/dashboard-home.feature`
- **ADR:** `docs/adr/0007-time-zones.md` (to write)

## Why
Timestamps are stored without a time zone and shown in the server's. "Today" for due dates is UTC. Someone in Tel Aviv or Los Angeles sees note times, "started" dates and overdue state shifted by hours.

## Scope
- ADR-0007: move every `timestamp` column to `timestamptz`, and decide how the viewer's time zone is known.
- Migration to `timestamptz`, interpreting existing values as UTC. Split it into expand and contract steps if the deploy needs that (see task 026's rollout note).
- Note times, "started" dates and invite expiry are shown in the viewer's time zone.
- "Today", "overdue" and "due this week" use the viewer's calendar day. Due dates stay `date`.

## Open questions (decide in the ADR)
- How is the viewer's time zone known? Proposed answer: a cookie set by a tiny client script from `Intl.DateTimeFormat().resolvedOptions().timeZone`, with UTC as the fallback. The alternative is a profile setting (M10 Accounts).
- "This week": keep the rolling seven days (task 010), or switch to the calendar week?

## Out of scope
- A per-user time zone setting UI (M10, if the ADR picks the cookie).

## Acceptance criteria
- [ ] A note added at 23:30 UTC shows the next day's date for a viewer in UTC+3.
- [ ] A task due "today" in UTC+3 shows as due today, not overdue, for that viewer just after their midnight.
- [ ] Existing rows keep their instant after the migration.

## Approach (brief)
Write the ADR first, in its own `docs:` PR. Then the schema change and migration (see the migration-order note in task 033). Then replace `todayUtc()` with `todayIn(timeZone)` and the `timeZone: "UTC"` formatting with the viewer's zone. The CLAUDE.md domain convention on calendar days changes in the same PR. E2E sets the browser's `timezoneId` per scenario.

## Test plan
- Acceptance: the scenarios above, tagged `@task:041`, with Playwright `timezoneId`.
- Unit: `todayIn`, due state across a midnight boundary.

## Progress log
- 2026-10-30 – Drafted from the task 010, 015 and 019 parking lots. Blocked on ADR-0007.

## Parking lot
