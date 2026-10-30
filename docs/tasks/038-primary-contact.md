# Task 038: Primary contact

- **Status:** in-progress
- **Milestone:** M9
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/customer-contacts.feature`

## Why
When a customer has several contacts, people need to know who to reach first.

## Scope
- Mark one contact as primary per customer. Marking another moves the mark.
- The primary contact is listed first with a "Primary" badge on the customer page, and its name shows on the customers list.

## Out of scope
- Other contact roles.

## Acceptance criteria
- [ ] Marking a contact as primary shows the badge and lists it first.
- [ ] Marking a second contact moves the badge; only one is primary.
- [ ] Deleting the primary contact leaves the customer with none.
- [ ] The customers list shows each customer's primary contact.

## Approach (brief)
Add `organization.primary_contact_id`, nullable, with `ON DELETE SET NULL`. A pointer on the organization keeps "only one primary" true without a partial unique index. See the migration-order note in task 033. Lookups use `visibleTo` as today.

## Test plan
- Acceptance: the scenarios above, tagged `@task:038`.
- Unit: contact ordering (primary first, then name).
- Storybook: contact row with and without the badge.

## Progress log
- 2026-10-30 – Drafted from the task 014 parking lot.

## Parking lot
