# Task 015: Notes log on a customer

- **Status:** done
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
- [x] Added notes show newest first with their date.
- [x] A note can be deleted.

## Approach (brief)
Same structure as contacts; body required (pattern from 012).

## Test plan
- Acceptance: `customer-notes.feature` (2 scenarios).
- Unit: note input parsing.

## Progress log
- 2026-10-23 – Task created.
- 2026-10-23 – 2 scenarios red → green (stable over 3 repeats); `parseNoteInput` unit tests. Migration `0007` creates `organization_note`. Notes show date and time in UTC (parked time-zone item, task 010). Full suite (53 e2e) green, lint, typecheck clean.
- 2026-10-26 – Merged in PR #4.

## Parking lot
- Show note times in the viewer's time zone (with the `timestamptz` ADR).
- Note author once projects/customers are shared (M8).
