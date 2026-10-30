# Task 038: Primary contact

- **Status:** done
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
- [x] Marking a contact as primary shows the badge and lists it first.
- [x] Marking a second contact moves the badge; only one is primary.
- [x] Deleting the primary contact leaves the customer with none.
- [x] The customers list shows each customer's primary contact.

## Approach (brief)
Add `organization.primary_contact_id`, nullable, with `ON DELETE SET NULL`. A pointer on the organization keeps "only one primary" true without a partial unique index. See the migration-order note in task 033. Lookups use `visibleTo` as today.

## Test plan
- Acceptance: the scenarios above, tagged `@task:038`.
- Unit: contact ordering (primary first, then name).
- Storybook: contact row with and without the badge.

## Progress log
- 2026-10-30 – Drafted from the task 014 parking lot.
- 2026-10-30 – 5 scenarios in `customer-contacts.feature` (`@task:038`), including a tampered form that points at another customer's contact. Red: all 5 failed (no "Make … primary" button); unit tests failed on the missing `contact-order` and `ContactRow` modules. Green: customer features 29/29, full e2e 107/107; unit 123 dashboard + 25 ui (4 new `primaryFirst` tests, 3 new `ContactRow` tests). Migration `0016` (renumbered `0017_handy_chronomancer` on `feat/m9-polish`, after task 033's `0016`; same SQL) adds `organization.primary_contact_id` (FK to `organization_contact`, `ON DELETE SET NULL`); deleting a customer with a primary contact still works. `ContactRow` (with stories) moved into `@repo/ui`. The make-primary action updates the organization only if the contact belongs to it (one `UPDATE … WHERE EXISTS`), after `requireOrganizationAccess` (visibleTo). The customers list gets the primary contact's name from a left join in `listOrganizations`. It no longer falls back to the first-added contact, so `firstContactNames` was removed.
- 2026-10-30 – Merged to `main` in PR #12 (M9). Combined branch: 146/146 e2e, 223 unit tests, lint and typecheck clean. The Storybook build on Node 22 (CI) was fixed in PR #13.

## Parking lot
- Unmarking a primary contact without choosing another (only removing the contact clears it today).
- A contact deleted in the instant between the action's check and its update raises a foreign-key error instead of "This contact no longer exists".
