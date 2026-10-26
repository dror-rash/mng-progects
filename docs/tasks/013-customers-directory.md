# Task 013: Customers directory

- **Status:** done
- **Milestone:** M6
- **Zone / package:** `apps/dashboard`, `packages/db`, `packages/ui`
- **Feature file:** `docs/features/customers.feature`
- **ADR:** `docs/adr/0004-typed-organizations-directory.md`

## Why
Work is done for customers. We need one place that lists them and holds their details, so tasks and projects can point at them (016, 017).

## Scope
- Schema (ADR-0004): `organization` table with `kind` (`customer`), `status` (Lead / Active / Past), name, phone, email, address, website, company/tax ID, general information, tags (`text[]`), owner. Kinds and statuses defined once in `features/organizations/`.
- "Customers" link in the zone header. `/dashboard/customers`: list with name, status, tags, and contact email/phone; filter by status and by tag; "New customer" form.
- `/dashboard/customers/<id>`: all details; edit page; delete with confirmation (linked projects and tasks keep existing, link cleared).
- Validation (pattern from 012): name required; email and website checked for format when given; website without a scheme gets `https://`.
- Owner-only, same pattern as projects.

## Out of scope
- Contact people (014), notes (015), links to projects/tasks (016, 017).
- Other kinds (service provider, supplier) – the `kind` column is ready; UI only for customers.
- Import/export, duplicate detection, search beyond the filters.

## Acceptance criteria
- [x] Create a customer with all details and see them on its page.
- [x] The list shows customers and filters by status and by tag.
- [x] Edit a customer's details.
- [x] Delete a customer after confirming.
- [x] Invalid email shows an inline error.
- [x] Another user's customer shows "Customer not found".

## Approach (brief)
Mirror `features/projects/` (queries, actions, `parseOrganizationInput`, `require-owned-organization`). Tags entered comma-separated, stored normalized (trimmed, de-duplicated, case-insensitive).

## Test plan
- Acceptance: `customers.feature` (6 scenarios).
- Unit: `parseOrganizationInput` (required name, email/website format, website scheme, tag normalization); status/kind parsing.
- Storybook: `Badge` (status, tags) and `NativeSelect` (status picker; moved up from 016).

## Progress log
- 2026-10-23 – Task created.
- 2026-10-23 – 6 scenarios red → green (stable over 3 repeats); 12 unit tests (input, statuses, tags), `Badge`/`NativeSelect` component tests + stories, `invalid()` now names the field. Migration `0005` creates `organization`. Header gets a Customers link and wraps on mobile (it overflowed at 390px). Full suite (49 e2e) green, lint, typecheck, Storybook clean.
- 2026-10-26 – Merged in PR #4.

## Parking lot
- Other kinds in the UI (service providers, suppliers).
- Structured address (street, city, country) if needed for invoices.
