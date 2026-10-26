# Task 020: M6 review fixes

- **Status:** in-progress
- **Milestone:** M6
- **Zone / package:** `apps/dashboard`, `packages/db`, `packages/ui`, `e2e`
- **Feature files:** `form-validation.feature`, `customers.feature`, `customer-links.feature`

## Why
`/venice-review` of `feat/m6-customers` (2026-10-26) found data-loss and correctness bugs that must be fixed before merging M6.

## Scope
- Dropdowns (customer status, project customer, task customer) keep the submitted choice after a validation error.
- Customers list: repeated query params don't crash; tag filter is case-insensitive; status and tag filters combine; filter chips move to `packages/ui` (`FilterChip`, with story and test); filtered empty state links to "Clear filters".
- Indexes on `project(owner_id, organization_id)` and `task(organization_id)`.
- One shared customer-ownership check for projects and tasks, covered by scenarios that try to link another user's customer.
- Saving a contact or task that no longer exists says so instead of reporting success.
- Email rejects `? & # , < > "`; website accepts `host:port`, rejects `user@host` URLs, stores a canonical address; input strips control characters and has length limits.
- Creating/renaming/deleting a customer refreshes every dashboard page that shows customer names.
- e2e: "I press" waits for the submission's response; `E2E_TAGS=""` doesn't run @wip specs.
- ADR-0004 accepted (with the note that only customers can be linked for now); CLAUDE.md/AGENTS.md drift.

## Out of scope (parking lot)
- Monday ticket: none linked; create one when the team board is set up for this project.
- Cross-user note delete scenario; customer page heading levels and labelled sections; error.tsx logging/digest; unscoped customer-name joins (owner/kind in the ON clause); customer page loading all tasks for progress; `invalid()` echoing hidden/internal fields; consistent field-less error handling across forms; not-found card / form helper / duplicate type cleanups; "I follow the link" exact URL resolution and "I see the text" visible-only filter.

## Acceptance criteria
- [ ] After a blank project name, the chosen customer is still selected.
- [ ] After an invalid customer email, the chosen status is still selected.
- [ ] After a blank task title, the chosen customer is still selected.
- [ ] Tags that differ only in case filter together; status and tag filters combine; a repeated param doesn't crash the list.
- [ ] Another user's customer can't be linked to a project or a task.
- [ ] A project card shows its customer.

## Test plan
- Acceptance: new scenarios above.
- Unit: website/email/control-char/length rules; tag list de-dup order; first-param helper; `invalid()`; `FilterChip`.

## Progress log
- 2026-10-26 – Task created from the review.
