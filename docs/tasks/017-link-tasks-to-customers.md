# Task 017: Link a task to a customer

- **Status:** todo
- **Milestone:** M6
- **Zone / package:** `apps/dashboard`, `packages/db`
- **Feature file:** `docs/features/customer-links.feature`

## Why
Some tasks are about a customer even inside an internal project ("call Acme about the invoice"). A task can also point at a different customer than its project.

## Scope
- Schema: nullable `task.organization_id`, `ON DELETE SET NULL`.
- Task page (011): "Customer" picker; defaults to the project's customer when one is set.
- Board cards show the customer name as text.
- Customer page "Open tasks" section: open tasks linked to the customer, across projects, linking to each task.

## Out of scope
- Linking a task to several organizations; linking to other kinds (the column already supports it).

## Acceptance criteria
- [ ] A task linked to a customer shows the customer on its page and board card.
- [ ] The customer page lists the customer's open tasks from any project.
- [ ] Deleting the customer keeps the task, without a customer.

## Approach (brief)
Same picker and owner check as 016.

## Test plan
- Acceptance: 3 scenarios in `customer-links.feature`.

## Progress log
- 2026-10-23 – Task created.

## Parking lot
- Show tasks for service providers once that kind has UI.
