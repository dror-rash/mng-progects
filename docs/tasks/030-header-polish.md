# Task 030: Header polish

- **Status:** in-review
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
- [x] At 360px, 768px and 1024px the header has no horizontal scroll, and every nav link is reachable.
- [x] On a phone, Home is reachable from the dashboard header.
- [x] The workspace link is announced as "<name>: switch workspace".
- [x] Opening a project from workspace B while A is current shows B in the header.

## Approach (brief)
`AppHeader` takes the workspace to show. Record pages (`projects/[projectId]`, its task page, `customers/[customerId]` and their edit/delete pages) pass the record's workspace name. Keep these page edits to the `AppHeader` props, because tasks 031 and 037 also edit some of those pages.

## Test plan
- Acceptance: viewport checks via Playwright `setViewportSize`; scenarios tagged `@task:030`.
- Storybook: `AppHeader` at phone, tablet and desktop widths, and with a record from another workspace.

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.
- 2026-10-30 – Scenarios added (3 in `workspace-switching.feature`, 4 in `zone-navigation.feature`, tagged `@task:030`). Red: 6 of 7 failed for the right reasons. The header overflowed by 19px at 360px and 81px at 768px, Home was missing on phones, and there was no "<name>: switch workspace" link. The 1024px case already passed and now guards against regressions. The `headerWorkspace` unit test was red because the module was missing.
- 2026-10-30 – Green: 7/7 `@task:030` scenarios pass and dashboard unit tests are 122/122 (3 new). Below `lg` the nav gets its own wrapping row. Home is always visible. The email shows from `xl` and truncates. Record pages pass `recordWorkspace(...)` to `AppHeader`, which looks up memberships only when the record isn't in the current workspace, and the header shows "in another workspace" when the workspaces differ. The right-hand actions group keeps a spot for task 036's theme toggle.
- 2026-10-30 – Full suite: 107/109 passed. The 2 failures were `workspace-members` scenarios that timed out on `page.goto` under machine load, and that feature passed 11/11 on rerun. `pnpm lint`, `pnpm typecheck` and `pnpm test` are clean.
- Storybook: the dashboard zone has no Storybook (only `packages/ui` does), so the e2e outline covers the phone, tablet and desktop widths. The project and customer scenarios cover the other-workspace case.

## Parking lot
- Storybook for dashboard-zone components (`AppHeader` and others), or move `AppHeader` into `packages/ui` once a second zone needs it.
