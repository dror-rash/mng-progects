# Task 017: Link a task to a customer

- **Status:** in-review
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
- [x] A task linked to a customer shows the customer on its page and board card.
- [x] The customer page lists the customer's open tasks from any project.
- [x] Deleting the customer keeps the task, without a customer.

## Approach (brief)
Same picker and owner check as 016.

## Test plan
- Acceptance: 3 scenarios in `customer-links.feature`.

## Progress log
- 2026-10-23 – Task created.
- 2026-10-23 – 3 scenarios red → green; `parseTaskInput` distinguishes chosen / none / not on the form (quick add uses the project's customer). Migration `0009` adds `task.organization_id` (SET NULL). Screenshot review caught a bug: after saving, the task form's Customer select reset to its first-load value, so a second save would clear the customer. Added a check to the scenario (red), fixed by keying the form on the last save. Full suite 58/58 twice; production build 58/58 three times with flat memory (221 → 315 MB).
- 2026-10-23 – Slow, flaky local runs were long-running dev servers near Next's memory threshold (dashboard dev ~4 GB, auto-restarting mid-run). Restarting `pnpm dev` fixed it; noted in WORKFLOW.md.

## Parking lot
- Show tasks for service providers once that kind has UI.
