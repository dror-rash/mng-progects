# Task 048: Partner companies, customer assignment and partner invites (admin side)

- **Status:** in-progress
- **Milestone:** M12 Partner Access
- **Zone / package:** `apps/dashboard`, `packages/db`, `e2e`
- **Feature file:** `docs/features/partners.feature`
- **Depends on:** tasks 046 and 047, ADR-0006, design `docs/superpowers/specs/2026-10-31-partner-access-design.md` (rules 2, 3, 6, 8d), plan `docs/superpowers/plans/2026-10-31-partner-access.md`

## Why
Tasks 046 and 047 gave the database partner companies, customer assignments and partner memberships, with access enforced in code and by row-level security, but nothing in the app creates them. Admins need to create partner companies, assign customers to them, and invite people as users of a partner (design rules 2 and 3). Changing someone's role or partner must not leave them assigned to tasks they can no longer see (rule 8d).

## Scope
- Partners pages (admins and auditors; not found for partner users):
  - `/partners`: the workspace's partners with their user and customer counts; "New partner" for admins.
  - `/partners/new`: create a partner (name, 1–100 characters); goes to its page.
  - `/partners/<id>`: its assigned customers (admins assign and unassign them) and its users.
- A "Partners" link in the header for admins and auditors.
- Invite links and the members page: the role select offers Admin, Auditor and "Partner: <name>" for each partner. A partner link makes a `partner` membership with that partner; the members page shows "Partner: <name>".
- Someone already in the workspace who opens any invite link sees "You're already a member of this workspace"; nothing changes (their role stays).
- `changeMembership` takes `{ role, partnerId }`. The last-admin rule still applies. When the role or partner changes it clears, in the same transaction, the user's assignments on tasks they can no longer see, through a new `SECURITY DEFINER` function `clear_unseen_assignments(p_workspace, p_user)` (admins of the workspace only; `EXECUTE` for `app_user` only).

## Out of scope
- Partners seeing their projects and customer names, creating partner projects (task 049).
- Cancel and copy (task 050).
- Deleting partners, and the invite links and memberships of a deleted partner (task 051).

## Acceptance criteria
- [ ] An admin creates a partner and assigns customers; the partner page lists them.
- [ ] A blank partner name shows "Enter a name".
- [ ] A partner invite link makes a partner user; the members page shows "Partner: Northwind".
- [ ] Someone already in the workspace who opens a partner link sees "You're already a member of this workspace" and stays an Admin.
- [ ] Changing a user's partner clears their assignments on tasks they can no longer see.
- [ ] Auditors see partners but can't change them.
- [ ] Partners pages are not found for partner users.

## Approach (brief)
- `features/partners/`: `partner-name.ts` (`parsePartnerName`, like `workspace-name.ts`), `queries.ts` (`listPartners`, `getPartnerForUser`, `listPartnerOptions`), `actions.ts` (`createPartnerAction`, `assignCustomerAction`, `unassignCustomerAction`), `partner-form.tsx`, `assign-customer-form.tsx`.
- One role choice for invites and role changes: `admin`, `auditor` or `partner:<id>` (`parseRoleChoice` in `features/access/roles.ts`); the server checks that the partner is one of the workspace's.
- Record lookups follow the existing pattern: `getPartnerForUser` returns the partner when `userId` is an admin or auditor of its workspace, with `canChange` for admins. Writes check `requireAdmin` in the same `withAccess`.

## Test plan
- Unit: `partner-name.test.ts`; `roles.test.ts` for the role choice.
- Database: `clear_unseen_assignments` in `packages/db/src/access.db.test.ts` (clears only what the user can no longer see; admins only).
- Acceptance: `docs/features/partners.feature` (`@task:048`).

## Progress log
- 2026-10-31 – Drafted from the task 048 brief and the controller's rulings 4 (the deleted partner's link is task 051's), 12 (clear unseen assignments in a `SECURITY DEFINER` function), 13 (last-admin rule; joining never changes an existing member's role).

## Parking lot
