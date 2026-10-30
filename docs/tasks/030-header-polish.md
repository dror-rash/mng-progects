# Task 030: Header polish

- **Status:** in-progress
- **Milestone:** M9
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/workspace-switching.feature`, `docs/features/zone-navigation.feature`

## Why
The dashboard header overflows on mid-size screens, phones have no way back to Home, and on a record from another of my workspaces the header names the wrong workspace.

## Scope
- No horizontal overflow between the `sm` and `lg` breakpoints. Nav and actions fit or wrap cleanly from 360px to desktop.
- Phones get a Home link (today the Home button is hidden below `sm`).
- The workspace link's accessible name says what it does: "Acme: switch workspace".
- A project, task or customer page shows **that record's** workspace in the header, not the cookie's. Add a small "in another workspace" hint when they differ.

## Out of scope
- The dark mode toggle (task 036 adds it to this header after this task merges).

## Acceptance criteria
- [ ] At 360px, 768px and 1024px the header has no horizontal scroll, and every nav link is reachable.
- [ ] On a phone, Home is reachable from the dashboard header.
- [ ] The workspace link is announced as "<name>: switch workspace".
- [ ] Opening a project from workspace B while A is current shows B in the header.

## Approach (brief)
`AppHeader` takes the workspace to show. Record pages (`projects/[projectId]`, its task page, `customers/[customerId]` and their edit/delete pages) pass the record's workspace name. Keep these page edits to the `AppHeader` props, because tasks 031 and 037 also edit some of those pages.

## Test plan
- Acceptance: viewport checks via Playwright `setViewportSize`; scenarios tagged `@task:030`.
- Storybook: `AppHeader` at phone, tablet and desktop widths, and with a record from another workspace.

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.

## Parking lot
