# Task 046: Roles and the access model (admin and auditor)

- **Status:** done
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
- `TaskBoard`, the contacts and the notes sections get a read-only mode (no drag, Move to, Delete or forms).

## Out of scope
- Partner companies, assigning customers, partner invites and the partner experience (tasks 048–049).
- Row-level security and the maintenance connection (task 047).
- Cancel and copy (task 050); soft delete, the Deleted view and restore (task 051).
- Who can be assigned a task (auditors are never assignable, design rule 7): with the partner experience.

## Acceptance criteria
- [x] An auditor sees every project and customer, with details and tasks.
- [x] An auditor sees no New project, Edit project, Add task or New customer; `/dashboard/projects/new` is a 404.
- [x] A project form posted by an auditor is refused; the name stays.
- [x] Admins invite admins or auditors (Role select).
- [x] An auditor sees the members list without Remove, role select or invite form.
- [x] After migrating, no membership has the role `member`.

## Approach (brief)
- Constraints are declared in `schema.ts` so Drizzle's snapshot knows them; the generated SQL is reordered so the data updates run before the checks, then the functions are appended.
- Record lookups by id return `canChange` from `can_change_project` / `can_change_customer`, so a record from another of my workspaces shows the controls my role there allows; lists use `canChange(workspace.role)` (projects) and `canChangeCustomers(workspace.role)` (customers: admins only, like `can_change_customer`).
- `customer_partner` carries `workspace_id`, and memberships, invites, projects and assignments reference `partner (id, workspace_id)` (and `organization (id, workspace_id)`), so the database keeps a partner and what points at it in one workspace.
- Creating a project or a customer needs an admin (`requireAdmin`) until partners can create their own projects (task 049). Members, invites and settings check `isAdmin` (through `access_role`) and keep their "Only admins can manage this workspace" message.

## Test plan
- Acceptance: `@task:046` scenarios in `roles.feature`; every existing scenario still passes (their users are admins; invited teammates are auditors unless made admins).
- Unit: `features/access/roles.test.ts`, `features/access/scope.test.ts`; `TaskBoard` read-only.
- Database: after migrating, `select count(*) from workspace_member where role = 'member'` is 0 and `can_see_project` answers for an admin.

## Progress log
- 2026-10-31 – Drafted from the M12 plan (task 046 brief) and the controller's rulings: `lifecycle` for `project.status`; no e2e for existing members (checked in SQL instead); invite Role defaults to Auditor; auditors get the 404 a missing record gets.
- 2026-10-31 – Feature files: `roles.feature` (`@task:046`); existing scenarios say "auditor" for invited teammates and use the Role select (`docs(features)` commit, reason: ADR-0006 removes the member role).
- 2026-10-31 – Red: `features/access/roles.test.ts` and `scope.test.ts` fail (no modules), the read-only `TaskBoard` test fails (buttons shown), `workspaceDetails` labels `auditor` as is; all six `@task:046` scenarios fail (no Role select on the invite form).
- 2026-10-31 – Migration 0018 (generated, then reordered so the data updates and the `organization (id, workspace_id)` unique run first; access functions appended). After migrating: `select count(*) from workspace_member where role = 'member'` → 0; open invite links → 0; every project `internal`/`active`. The six functions checked by hand in a rolled-back transaction (two partners sharing a customer, an auditor, an admin, an outsider; unassigning, deleting the customer, the project or the partner) and the checks and composite foreign keys refuse bad rows.
- 2026-10-31 – Green: `features/access/` (roles, predicates, scope, require-change); queries, actions and pages switched; `visibleTo` removed. The two longest auditor scenarios are tagged `@slow` (over 30 s on the dev servers).
- 2026-10-31 – `pnpm lint`, `pnpm typecheck` clean; `pnpm test` 284 (dashboard 215, ui 51, auth 13, db 5); full e2e 166/166.

## Parking lot
- Auditors can still be chosen as assignees, and changing someone to Auditor keeps their assignments (design rules 7 and 8d): with the partner experience (task 049).
- `customerInWorkspace` checks only the workspace; partners must be limited to their assigned customers (task 049).
- A partner's invite link should stop working when the partner is deleted (design 8c), and memberships of a deleted partner should drop out of `listMemberships` (`access_role` already ignores them): tasks 048 and 051.
- Hard-deleting a customer that a partner project points at fails the `project_partner_customer_check` (the foreign key sets `organization_id` to null); soft delete (task 051) replaces the hard delete.
- The home page's empty state links auditors to "Create your first project".
