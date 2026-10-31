# Task 044: New project from a customer's page

- **Status:** in progress
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
- [ ] "New project" on a customer's page opens the form with that customer chosen; creating the project lists it on the customer's page.
- [ ] An unknown customer in the link shows "No customer".

## Approach (brief)
`projects/new/page.tsx` reads `customer` with `firstParam`, keeps it only if it's in `listOrganizations(workspace.id, "customer")`, and passes it to `ProjectForm` as `defaultCustomerId` plus a `cancelHref`. The login redirect keeps the param (`withParams`).

## Test plan
- Acceptance: two `@task:044` scenarios in `customer-links.feature`.
- Unit: none (no new logic beyond a list lookup).

## Progress log
- 2026-10-31 – Drafted from a direct request ("add the New project link on the customer page").

## Parking lot
