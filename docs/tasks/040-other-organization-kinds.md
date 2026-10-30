# Task 040: Service providers and suppliers

- **Status:** blocked (needs product answers below)
- **Milestone:** M9
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** new `docs/features/organization-kinds.feature`
- **ADR:** `docs/adr/0004-typed-organizations-directory.md`

## Why
ADR-0004 built one organizations directory so that kinds other than customers could be added without a schema change. Only customers have pages so far.

## Scope
- Add the `service_provider` and `supplier` kinds to `ORGANIZATION_KINDS`, each with list, detail, new, edit and delete pages that reuse the customer components (contacts, notes, tags).
- Projects and tasks can link to an organization of any kind. Each organization page shows its projects and open tasks (covers the task 017 parking-lot item).

## Open questions (decide before coding)
- Which kinds, and what are they called in the UI?
- Same fields as customers, or different ones?
- Separate nav entries, or one "Directory" page with a kind filter?
- Can a project link to several organizations (customer plus supplier)? Today a project has one `organization_id`, so this would need a schema change and an ADR-0004 update.

## Out of scope
- Structured addresses (task 013 parking lot: only if invoices need them).

## Acceptance criteria
- [ ] To be written once the questions above are answered.

## Approach (brief)
Make the customer pages generic over `kind` (route segment or config) instead of copying them.

## Test plan
- Acceptance: CRUD and linking scenarios per kind, tagged `@task:040`.

## Progress log
- 2026-10-30 – Drafted from the task 013 and 017 parking lots. Blocked on product decisions.

## Parking lot
