# Task 016: Link projects to a customer

- **Status:** done
- **Milestone:** M6
- **Zone / package:** `apps/dashboard`, `packages/db`
- **Feature file:** `docs/features/customer-links.feature`

## Why
Seeing every project done for a customer ("previous projects") is the main reason to link them.

## Scope
- Schema: nullable `project.organization_id`, `ON DELETE SET NULL`.
- Pick a customer (or none) when creating or editing a project.
- Project page and project cards show the customer name, linking to the customer.
- Customer page "Projects" section lists linked projects with their progress (reuses `ProjectList`).

## Out of scope
- More than one customer per project.

## Acceptance criteria
- [x] A project linked to a customer shows on that customer's page and shows the customer's name.
- [x] Deleting the customer keeps the project, without a customer.

## Approach (brief)
Customer picker uses `NativeSelect` (added in 013). Owner check covers both the project and the chosen customer.

## Test plan
- Acceptance: 2 scenarios in `customer-links.feature`.
- Unit: none beyond existing parsers (customer id validated as owned).
- Storybook: none new.

## Progress log
- 2026-10-23 – Task created.
- 2026-10-23 – 2 scenarios red → green; `parseProjectInput` reads the customer; actions refuse a customer the user doesn't own. Migration `0008` adds `project.organization_id` (SET NULL). Fixed test-step races found under load: "I press" waits for the submission to finish; "I follow the link" waits for the full URL incl. query. Dev-mode expect timeout 15s (routes compile on first visit); CI keeps 5s. Full suite 55/55 three runs in a row.
- 2026-10-26 – Merged in PR #4.

## Parking lot
