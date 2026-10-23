# Task 015: Notes log on a customer

- **Status:** todo
- **Milestone:** M6
- **Zone / package:** `apps/dashboard`, `packages/db`
- **Feature file:** `docs/features/customer-notes.feature`

## Why
Things learned about a customer (a call, a preference, an issue) need to be kept with a date, not overwritten.

## Scope
- Schema: `organization_note` (body, created_at), cascade-deleted with the customer.
- Customer page "Notes" section: add a note; notes listed newest first with their date; delete a note.
- "General information" on the customer stays a single editable field (013).

## Out of scope
- Editing a note after saving (delete and re-add), note authors (needs M8 sharing), rich text, attachments.

## Acceptance criteria
- [ ] Added notes show newest first with their date.
- [ ] A note can be deleted.

## Approach (brief)
Same structure as contacts; body required (pattern from 012).

## Test plan
- Acceptance: `customer-notes.feature` (2 scenarios).
- Unit: note input parsing.

## Progress log
- 2026-10-23 – Task created.

## Parking lot
- Note author once projects/customers are shared (M8).
