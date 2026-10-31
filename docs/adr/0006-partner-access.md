# ADR-0006: Partner access — admins, auditors and partner companies

- **Status:** accepted
- **Date:** 2026-10-31
- **Design:** `docs/superpowers/specs/2026-10-31-partner-access-design.md` (approved by the owner; the rules and their reasons live there)
- **Amends:** ADR-0005 (roles and the access rule). Workspaces, invite links, the current-workspace cookie and assignees stay as they are.

## Context
Under ADR-0005 every workspace member sees and changes everything in the workspace. The owner wants outside partner companies in the same workspace, each working only on its own projects for the customers assigned to it, plus admins who do anything and auditors who see everything and change nothing. Leaking one partner's data to another is the failure that matters most, so access has to be part of the data model and enforced by the database, not only by the code that happens to remember a filter.

## Decision
- **Roles per membership:** `admin`, `auditor`, `partner` (`member` is removed; existing members become admins). A partner membership names one partner company (`workspace_member.partner_id`, check constraint).
- **Partner companies** are their own table (`partner`), not an organization kind. Admins assign customers to partners (`customer_partner`, many-to-many). Partner users join through an invite link tied to their partner (`workspace_invite.role`, `partner_id`).
- **Every project has a required, fixed owner:** `project.visibility` (`internal | partner`) and `project.partner_id`, with check constraints (partner projects need a partner and a customer). The owner never changes; work moves by copying into a new project and cancelling the original (`project.status`: `active | canceled`, `copied_from_id`).
- **One access rule, defined once, in the database.** SQL functions (`can_see_project`, `can_change_project`, `can_see_customer`, `can_see_customer_name`, `can_change_customer`, `access_role`) define who can see and change what. They are `SECURITY DEFINER` and `STABLE`, so policies can call them without recursion. App code uses them through `features/access/` predicates, replacing `visibleTo`.
- **Row-level security as the second lock.** RLS is enabled and forced on every customer, project, task, partner and membership table, with policies calling the same functions for `current_setting('app.user_id')`. The runtime pool connects with `options: -c role=app_user`: a `NOLOGIN` role that owns nothing and cannot bypass RLS. Each data access runs in a short transaction that sets `app.user_id` (`withAccess`). A query run without it sees nothing (fail closed). Migrations, seeds and test fixtures use a separate maintenance connection (`@repo/db/maintenance`), which app code may not import (lint rule).
- **Partners see customer names only.** Partners have no `SELECT` on `organization`. Names come from a security-barrier view, `customer_name`, which returns `(id, workspace_id, name)` for rows where `can_see_customer_name` is true.
- **All deletes are soft** (`deleted_at`, `deleted_by`) for projects, tasks, customers, contacts, notes and partners. Admins and auditors see a Deleted view; admins restore. A deleted customer counts as unassigned; a deleted partner's users lose access. Deleting a workspace stays a hard delete.

## Alternatives considered
- **Partners as separate workspaces.** Strong isolation for free, but customers would have to be duplicated per partner, and admins and auditors would have to switch between workspaces to see everything.
- **Per-project sharing with individual users.** Finer-grained, but every list and count needs its own grant join, and the owner thinks in companies, not people.
- **Code-only checks (as in ADR-0005).** Simpler, but one forgotten filter leaks. The owner asked for "no way to leak".
- **A separate Cloud SQL login user for the runtime.** It would need Terraform, a new secret and deploy changes. Setting the role on connect gives the same protection with the existing user, because the role is set on every connection the pool opens.
- **Partners as an organization kind (ADR-0004).** It would tie access control to a directory that partners can't see, and to the blocked task 040.

## Consequences
- **Good:** One rule for code and database. A missing filter returns nothing instead of leaking. Ownership is enforced by constraints. Soft delete makes every removal recoverable.
- **Bad / trade-offs:**
  - Every query moves into a short transaction (`BEGIN`, `set_config`, query, `COMMIT`): more round trips per query.
  - Policies call functions per row, which is fine at this scale; watch the cost with EXPLAIN on the largest lists.
  - Seeds and e2e fixtures must use the maintenance connection.
  - The access functions are a single point: a wrong rule is wrong in both locks. The leak test suite exists to catch that.
- **Follow-ups:** an audit log for auditors; purging soft-deleted rows; pagination of the projects table once partners have many projects.
