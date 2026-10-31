# Task 044: New project from a customer's page

- **Status:** done
- **Milestone:** unscheduled (requested directly; parking lot of task 042)
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/customer-links.feature`

## Why
To start a project for a customer you go to All projects, then New project, then pick the customer again. The customer's page should offer it directly.

## Scope
- The Projects section of a customer's page has a "New project" link to `/projects/new?customer=<id>`.
- `/projects/new` preselects that customer, and Cancel goes back to the customer's page.
- A `customer` that isn't one of the workspace's customers is ignored (No customer, Cancel goes to All projects).
- The empty state on the customer page points at the link.

## Out of scope
- Preselecting a customer anywhere else (the projects table filter, for example).

## Acceptance criteria
- [x] "New project" on a customer's page opens the form with that customer chosen; creating the project lists it on the customer's page.
- [x] An unknown customer in the link shows "No customer".

## Approach (brief)
`projects/new/page.tsx` reads `customer` with `firstParam`, keeps it only if it's in `listOrganizations(workspace.id, "customer")`, and passes it to `ProjectForm` as `defaultCustomerId` plus a `cancelHref`. The login redirect keeps the param (`withParams`).

## Test plan
- Acceptance: two `@task:044` scenarios in `customer-links.feature`.
- Unit: none (no new logic beyond a list lookup).

## Progress log
- 2026-10-31 – Drafted from a direct request ("add the New project link on the customer page").
- 2026-10-31 – Red: "Starting a project from a customer's page" fails (no link). "An unknown customer … is ignored" already passes (the form defaults to No customer); it stays as a guard.
- 2026-10-31 – Green: `/projects/new` reads `customer`, keeps it only if it's one of the workspace's customers, and passes `defaultCustomerId` and `cancelHref` to `ProjectForm`; the customer page has a "New project" button in its Projects section.
- 2026-10-31 – `pnpm lint`, `pnpm typecheck` clean; `pnpm test` 259; full e2e 155/155.

## Parking lot
