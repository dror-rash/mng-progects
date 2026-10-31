# Task 046: Roles and the access model (admin and auditor)

- **Status:** in-progress
- **Milestone:** M12 Partner Access
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/roles.feature` (and wording in `workspace-members.feature`, `workspaces.feature`)
- **Depends on:** ADR-0006, design `docs/superpowers/specs/2026-10-31-partner-access-design.md`, plan `docs/superpowers/plans/2026-10-31-partner-access.md`

## Why
Every workspace member can see and change everything (ADR-0005). ADR-0006 replaces the Admin/Member roles with Admin, Auditor and Partner, and defines who can see and change what once, as SQL functions, so code (now) and row-level security (task 047) share one rule. This task brings in the data model, the functions, and the admin/auditor half of the rule; partners get their UI in tasks 048–049.

## Scope
- Schema and one migration:
  - `workspace_member.role` defaults to `admin`; new `partner_id`. Existing `member` rows become `admin`.
  - New tables `partner` and `customer_partner` (a customer and a partner in the same workspace).
  - `project.visibility` (`internal | partner`), `project.partner_id`, `project.status` (`active | canceled`; Drizzle property `lifecycle`), `project.copied_from_id`. Existing projects are internal.
  - `deleted_at`, `deleted_by` on project, task, organization, organization_contact, organization_note and partner (no soft delete yet: task 051).
  - `workspace_invite.role` and `partner_id`. Open invite links are revoked (they used to make members).
  - Check constraints for roles, visibility, status and "partner id exactly when partner".
  - The six access functions: `access_role`, `can_see_project`, `can_change_project`, `can_see_customer`, `can_see_customer_name`, `can_change_customer` (`STABLE SECURITY DEFINER SET search_path = public`).
- `features/access/`: `roles.ts` (moved from `features/workspaces/roles.ts`; Admin, Auditor, Partner), `predicates.ts` (SQL conditions calling the functions), `scope.ts` (`canChange(role)`), `require-change.ts` (`requireProjectChange`, `requireCustomerChange`, `requireAdmin`). `visibleTo` is removed.
- Every list and count takes `userId` and filters with the predicates and `deleted_at is null`.
- Every project or task write calls `requireProjectChange`; every customer, contact or note write calls `requireCustomerChange`.
- Pages hide forms from auditors; `/projects/new` and `/customers/new` are a 404 for them; a record's edit and delete pages show its not-found page.
- The invite form has a "Role" select (Admin, Auditor; Auditor first chosen, least privilege). Joining gives the link's role.
- The members page changes roles with a select (Admin, Auditor) instead of the Make admin / Make member toggle.

## Out of scope
- Partner companies, assigning customers, partner invites and the partner experience (tasks 048–049).
- Row-level security and the maintenance connection (task 047).
- Cancel and copy (task 050); soft delete, the Deleted view and restore (task 051).
- Who can be assigned a task (auditors are never assignable, design rule 7): with the partner experience.

## Acceptance criteria
- [ ] An auditor sees every project and customer, with details and tasks.
- [ ] An auditor sees no New project, Edit project, Add task or New customer; `/dashboard/projects/new` is a 404.
- [ ] A project form posted by an auditor is refused; the name stays.
- [ ] Admins invite admins or auditors (Role select).
- [ ] An auditor sees the members list without Remove, role select or invite form.
- [ ] After migrating, no membership has the role `member`.

## Approach (brief)
- Constraints are declared in `schema.ts` so Drizzle's snapshot knows them; the generated SQL is reordered so the data updates run before the checks, then the functions are appended.
- Record lookups by id return `canChange` from `can_change_project` / `can_change_customer`, so a record from another of my workspaces shows the controls my role there allows; lists use `canChange(workspace.role)`.

## Test plan
- Acceptance: `@task:046` scenarios in `roles.feature`; every existing scenario still passes (their users are admins; invited teammates are auditors unless made admins).
- Unit: `features/access/roles.test.ts`, `features/access/scope.test.ts`; `TaskBoard` read-only.
- Database: after migrating, `select count(*) from workspace_member where role = 'member'` is 0 and `can_see_project` answers for an admin.

## Progress log
- 2026-10-31 – Drafted from the M12 plan (task 046 brief) and the controller's rulings: `lifecycle` for `project.status`; no e2e for existing members (checked in SQL instead); invite Role defaults to Auditor; auditors get the 404 a missing record gets.

## Parking lot
