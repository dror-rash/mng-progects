# Task 014: Contact people on a customer

- **Status:** todo
- **Milestone:** M6
- **Zone / package:** `apps/dashboard`, `packages/db`
- **Feature file:** `docs/features/customer-contacts.feature`

## Why
A customer is a company; the work happens with specific people. We need each person's role and how to reach them.

## Scope
- Schema: `organization_contact` (name, role, phone, email), cascade-deleted with the customer.
- Customer page "Contacts" section: list, add, edit, remove.
- The customers list shows the first contact's name next to the customer.

## Out of scope
- A primary-contact flag, contact-level notes, contacts shared across customers.

## Acceptance criteria
- [ ] Add a contact person and see them on the customer page.
- [ ] Edit and remove a contact person.

## Approach (brief)
`features/organizations/contacts/` with its own input parser (name required, email format).

## Test plan
- Acceptance: `customer-contacts.feature` (2 scenarios).
- Unit: contact input parsing.

## Progress log
- 2026-10-23 – Task created.

## Parking lot
- Mark a primary contact.
