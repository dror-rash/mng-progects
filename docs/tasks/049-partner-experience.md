# Task 049: The partner experience, and the leak suite

- **Status:** in-progress
- **Milestone:** M12 Partner Access
- **Zone / package:** `apps/dashboard`, `packages/db`, `e2e`
- **Feature file:** `docs/features/partner-access.feature`
- **Depends on:** tasks 046, 047 and 048, ADR-0006, design `docs/superpowers/specs/2026-10-31-partner-access-design.md` (rules 3, 4, 5, 6, 7, 7a; anti-goals), plan `docs/superpowers/plans/2026-10-31-partner-access.md`

## Why
Tasks 046–048 gave the database partners, customer assignments, access functions and row-level security, and gave admins the pages to set partners up. A partner's user can sign in, but the app still reads customer names from `organization` (which row-level security hides from them), offers project creation without letting them create, and offers auditors and other partners' users as assignees. This task makes the app work for partner users, and adds the acceptance suite that tries to leak another partner's data through every page, link and form (design "Enforcement" 3).

## Scope
- Customer names come from the `customer_name` view everywhere a partner sees one: project lists (table and tiles), home, the project page, the board, the task page. A partner sees the name as text, never a link to a customer page. A task's own customer shows only while the partner may see it (rule 7a); otherwise "No customer".
- `customer_name` lists customers only (not deleted), so it can replace the `organization` joins without showing a deleted customer's name (new migration; applied ones are not edited).
- Customer choices (new project, edit project, the task's Customer select, the projects filter) come from `customer_name`. For a partner's project only the partner's assigned customers are offered, and a partner's project always has a customer.
- Project creation: partners create projects for their own partner (owner from the scope, customer assigned to them). Admins get an "Owner" select: "Internal" or one of the workspace's partners; a partner's project needs a customer assigned to that partner. Auditors still can't. The owner never changes when editing (rule 4a).
- Task writes (rule 7a): in a partner's project a task's customer must be one of the partner's assigned customers.
- Assignees (rule 7): options and the server check allow the project's partner's users plus admins for a partner's project, and admins only for an internal project. Auditors are never assignable. A refused assignee looks like a made-up id.
- Navigation: no Customers link for partners; every `app/customers/**` page is not found for them (explicit, beside row-level security).
- Database test: partner A can't move its own project to partner B.
- Leak suite `docs/features/partner-access.feature` (`@task:049`): two partners sharing one customer, built through the maintenance connection; every check through the app as a signed-in user.

## Out of scope
- Cancel and copy (task 050).
- Soft delete, the Deleted view, and the soft-deleted partner lockout (task 051).

## Acceptance criteria
- [ ] Lists (table, tiles, filters) and Home show only my partner's projects; Home's totals count only them.
- [ ] Another partner's project and task addresses show the same page as made-up ones.
- [ ] Another partner's ids posted through the real forms (project id, customer id, assignee id, task customer id) get the same refusal as made-up ids, and nothing changes.
- [ ] I see customer names as text, no Customers link, and customer pages are not found.
- [ ] I create projects only for my assigned customers; an admin chooses the owner.
- [ ] Taking a customer away hides its projects from the partner (admins still see them), and a save in flight is refused.
- [ ] My tasks shows only tasks I can see.
- [ ] Assignee options: the project's partner's users and admins; admins only for internal projects; never auditors.
- [ ] An auditor sees both partners' projects.

## Approach (brief)
- `features/organizations/customer-names.ts`: `listCustomerNames(userId, workspaceId, partnerId?)` and `isCustomerChoice(...)` (the write check), both on `schema.customerName`, narrowed to a partner's customers with `partnerServesCustomer` (`features/access/predicates.ts`).
- `features/projects/project-owner.ts`: `parseProjectOwner` for the Owner select (`internal` or a partner id).
- `features/workspaces/members.ts`: `listAssigneeOptions(userId, project)` and `isAssignable(userId, project)` share one SQL condition.
- `features/access/scope.ts`: `canSeeCustomers(role)` for the header and the customers pages.

## Test plan
- Unit: `project-owner.test.ts`, `scope.test.ts` (`canSeeCustomers`).
- Database: `access.db.test.ts` (partner A can't move its project to partner B; `customer_name` leaves out deleted customers).
- Acceptance: `docs/features/partner-access.feature` (`@task:049`).

## Progress log
- 2026-10-31 – Drafted from the task 049 brief, the deferred review items (task customer names, `customer_name` everywhere, partner project creation, assignees, the move-project DB test) and the controller's rulings 7 (not found looks like a made-up id), 14 (background through the maintenance connection, checks through the UI) and 15 (tampered forms submit the real form).

## Parking lot
