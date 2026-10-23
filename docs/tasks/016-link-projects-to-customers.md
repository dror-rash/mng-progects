# Task 016: Link projects to a customer

- **Status:** todo
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
- [ ] A project linked to a customer shows on that customer's page and shows the customer's name.
- [ ] Deleting the customer keeps the project, without a customer.

## Approach (brief)
Customer picker is the `NativeSelect` (introduced here; moved from 018). Owner check covers both the project and the chosen customer.

## Test plan
- Acceptance: 2 scenarios in `customer-links.feature`.
- Unit: none beyond existing parsers (customer id validated as owned).
- Storybook: `NativeSelect`.

## Progress log
- 2026-10-23 – Task created.

## Parking lot
