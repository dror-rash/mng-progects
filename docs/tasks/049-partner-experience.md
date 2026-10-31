# Task 049: The partner experience, and the leak suite

- **Status:** done
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
- [x] Lists (table, tiles, filters) and Home show only my partner's projects; Home's totals count only them.
- [x] Another partner's project and task addresses show the same page as made-up ones.
- [x] Another partner's ids posted through the real forms (project id, customer id, assignee id, task customer id) get the same refusal as made-up ids, and nothing changes.
- [x] I see customer names as text, no Customers link, and customer pages are not found.
- [x] I create projects only for my assigned customers; an admin chooses the owner.
- [x] Taking a customer away hides its projects from the partner (admins still see them), and a save in flight is refused.
- [x] My tasks shows only tasks I can see.
- [x] Assignee options: the project's partner's users and admins; admins only for internal projects; never auditors.
- [x] An auditor sees both partners' projects.

## Approach (brief)
- `features/organizations/customer-names.ts`: `listCustomerNames(userId, workspaceId, partnerId?)` and `isCustomerChoice(...)` (the write check; replaces `customerInWorkspace`), both on `schema.customerName`, narrowed to a partner's customers with `partnerServesCustomer` (`features/access/predicates.ts`).
- `features/projects/project-owner.ts`: `parseProjectOwner` for the Owner select (`internal` or a partner id).
- `features/workspaces/members.ts`: `listAssigneeOptions(userId, project)` (replaces `listMemberOptions`, whose only use was the assignee picker) and `isAssignable(assigneeId, project)` share one SQL condition.
- `features/access/scope.ts`: `canSeeCustomers(role)` for the header and the customers pages.

## Test plan
- Unit: `project-owner.test.ts`, `scope.test.ts` (`canSeeCustomers`).
- Database: `access.db.test.ts` (partner A can't move its project to partner B; `customer_name` leaves out deleted customers).
- Acceptance: `docs/features/partner-access.feature` (`@task:049`).

## Progress log
- 2026-10-31 – Drafted from the task 049 brief, the deferred review items (task customer names, `customer_name` everywhere, partner project creation, assignees, the move-project DB test) and the controller's rulings 7 (not found looks like a made-up id), 14 (background through the maintenance connection, checks through the UI) and 15 (tampered forms submit the real form).
- 2026-10-31 – Red: 6 of 13 `@task:049` scenarios fail (no customer names or choices for partners, no partner project creation, no Owner select, auditors and other partners' users offered as assignees); the other 7 already hold through row-level security and stay as guards. DB: `customer_name` lists a deleted customer; the move-to-another-partner test already passes (`project_update`'s WITH CHECK requires the partner's own `partner_id`) and stays as a guard. Unit: `project-owner` (no module), `canSeeCustomers` (missing).
- 2026-10-31 – Migration 0023 narrows `customer_name` to customers, not deleted (`CREATE OR REPLACE VIEW` keeps its grants). DB tests 21/21.
- 2026-10-31 – Customer names and choices through `customer_name` (`customer-names.ts`, `partnerServesCustomer`), project owner on create (`project-owner.ts`; the Owner select only once the workspace has partners, and a form without it means internal), the customer and assignee checks on project and task writes, assignee options per project, text instead of customer links for partners, no Customers link, customers list not found for partners. Customer record pages stay not found through `getOrganizationForUser` (`can_see_customer`), per record rather than by the current workspace's role. `@task:049` 13/13.
- 2026-10-31 – Feature changes: the lists scenario searches for one word (the shared search step matches `%20`, the form sends `+`); `task-assignees.feature` invites the teammate as an Admin, since an invite link makes an auditor by default and auditors are no longer assignable (rule 7).
- 2026-10-31 – `pnpm lint`, `pnpm typecheck` clean; `pnpm test` 305 (dashboard 233, ui 51, auth 13, db 8); `pnpm --filter @repo/db test:db` 21/21; full e2e 186/186 at load average 14–20.
- 2026-10-31 – Review fix round 1: the shared search step accepts a space sent as `+`, and the lists scenario searches for "GX App" again (reverting the rewording). Saving a task kept a customer the user can't choose only if the form left the field out; it posted "No customer" and cleared it. The edit form now omits `customerId` until another customer is chosen (`edit-task-form.test.tsx`), and the task-customer scenario checks that the admin still sees "Initech" after the partner saves.

## Parking lot
- An admin's new project form offers every customer whatever the chosen Owner; the server refuses a customer the partner doesn't serve ("Choose a customer assigned to this partner"). Narrowing the Customer choices to the chosen partner needs a client-side filter.
- A partner with no assigned customers sees an empty Customer select and gets "Choose one of your customers" on create; a hint ("No customers are assigned to your partner yet") would be friendlier.
- A task assigned to someone no longer assignable (e.g. an auditor assigned before task 049) shows their name, but the Assignee select can't show them, so the next save of that task clears the assignee.
- The join page still says "You'll see its projects, tasks and customers" for every role (from task 048's parking lot).
- The project and task forms have no Storybook stories, like the other dashboard feature forms.
