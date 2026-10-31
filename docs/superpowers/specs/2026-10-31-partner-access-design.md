# Partner access: admins, auditors and partner companies

- **Date:** 2026-10-31
- **Status:** draft for review (builder check done; owner answers on moving projects and deletes included)
- **Replaces parts of:** ADR-0005 (workspace roles and the "every member sees everything" access rule). An ADR-0006 records the decision once this design is approved.

## Intent
Today every member of a workspace sees and changes every customer and project in it. The workspace owner wants to bring outside **partner companies** into the same workspace. Each partner company works on its own projects for the customers assigned to it, and **must never see anything belonging to another partner**. Two more kinds of user cover the people inside the business: admins, who can do anything, and auditors, who can see everything but change nothing.

Leaking data between partners is the failure that matters most. Access therefore has to be a required part of the data model and be enforced where data is read, not only hidden in the UI. A forgotten filter on one page must not be enough to leak.

## Who can do what

| | Admin | Auditor | Partner user |
|---|---|---|---|
| Customers: list, details, contacts, notes | full | read | **name only**, and only customers assigned to their partner |
| Create, edit or delete customers | yes | no | no |
| Internal projects (no partner) | full | read | never |
| A partner's projects | full | read | full, for **their own partner** only, and only while the project's customer is still assigned to that partner |
| Tasks | follow the project | read | follow the project |
| Create projects | for any customer, internal or for a partner | no | only for customers assigned to their partner; the project belongs to their partner |
| Cancel a project, or copy it to a new one | yes | no | cancel own partner's projects; copy within their own partner (*my call*) |
| Delete projects and tasks (soft) | yes | no | own partner's projects and their tasks |
| Delete customers, contacts, notes, partners (soft) | yes | no | no |
| See and restore anything deleted | yes | see only | no |
| Partners: create, assign customers, invite links | yes | see (read-only) | no |
| Members, roles, workspace settings | yes | members list read-only (*my call*) | no |

Rules behind the table (all decided by the owner unless marked *my call*):

1. **Roles are per workspace membership:** `admin`, `auditor`, `partner`. A partner membership names exactly one partner company. Today's `member` role goes away.
2. **A partner company** has one or more users. People join it through an **invite link tied to that partner**; opening the link makes them a partner user of that company in that workspace.
3. **Customers are assigned to partners by admins.** One customer can be assigned to several partners. Partner users see only the **names** of their assigned customers, as the choices when creating a project (and when choosing a task's customer). Nothing else about a customer is visible to them: no customer pages, contacts, notes, or customer list.
4. **Every project has a required owner:** internal or exactly one partner. Internal projects are visible to admins and auditors only. A partner's project must have a customer that is assigned to that partner when the project is created or changed.
4a. **A project's owner never changes.** To hand work to another partner (or between internal and a partner), an admin creates a new project, optionally **copied from the existing one**, and marks the original **Canceled**. A copy takes the name, description and tasks (title, description, status, priority, due date). *My call:* it does not copy assignees, task customers the new owner can't see, or deleted tasks; the new project records which project it was copied from, and only people who can see both see that link.
4b. **Canceled** is a project status set by hand (*my call*: by anyone who can edit the project; it can be undone). A canceled project keeps its tasks and stays visible to whoever could see it, shows "Canceled" in place of its task-derived status (task 043), and has its own value in the status filter.
5. **Partners never see each other's projects**, even for a shared customer.
6. **Removing a customer from a partner** hides that partner's projects for that customer from the partner. The projects are kept, and admins still see them. Assigning the customer again makes them visible again (*my call*: that follows from rule 4 being checked when data is read).
7. **Tasks follow their project.** Whoever can see a project sees and works on all of its tasks. Tasks in a partner's project can be assigned to that partner's users or to admins (*my call*: admins are often the counterpart; auditors are never assignable, since they can't change anything).
7a. **A task's own customer** (a task can name a customer other than its project's, task 017): in a partner's project it must be one of that partner's assigned customers, checked on every write. When reading, a partner sees a task's customer name only while that customer is assigned to them; otherwise it shows as no customer (*my call*, from the anti-goal on customers).
8. **All deletes are soft:** projects, tasks, customers, contacts, notes and partners. A deleted item disappears from every normal view for everyone. Admins see a "Deleted" view and can restore; auditors can see that view. *My call:* deleting a whole workspace stays a hard delete (ADR-0005 amendment, task 029), and revoking an invite link stays as it is.
8a. **Soft-deleting a project** hides its tasks with it; restoring the project brings them back as they were. Tasks deleted on their own before that stay deleted (*my call*).
8b. **A deleted customer** counts as unassigned from every partner: partners lose sight of its projects (as in rule 6), admins keep them, and restoring the customer brings everything back (*my call*, so a partner project never loses its customer).
8c. **A deleted partner company:** its users lose access to everything in the workspace (they stay listed for admins as members of a deleted partner), its invite links stop working, and its projects are kept for admins and auditors. Restoring the partner gives its users back exactly what they had (*my call* on the details).
8d. **Joining and role changes** (*my call*): someone who is already a member of the workspace and opens an invite link is told they're already a member and nothing changes; only admins change roles or a user's partner, on the members page, and the last-admin rule still applies. Changing a user's role or partner clears, in the same transaction, their assignments on tasks they can no longer see.
9. **When this ships:** every existing member becomes an admin, every existing project becomes internal, and no customer is assigned to any partner. *My call:* open workspace invite links are revoked, because they used to make members and nothing should silently join with broader access. Admins create new ones and choose the role.

## Goals
- A partner user can only ever reach their own partner's projects (and tasks), and only the names of their assigned customers, through any page, link, form, count, chart or export.
- Ownership of a project is a required property, enforced by the database.
- One place defines "who can see this row". Every query uses it, and the database enforces it again as a second lock.
- Admins manage partners, customer assignments and partner invite links in the app.

## Non-goals
- Sharing individual projects with individual users, or roles within a partner company: all users of a partner see the same things.
- Field-level permissions beyond "customer name only".
- Email invitations (still invite links, ADR-0005).
- Purging soft-deleted data permanently (Parking lot).
- An audit log of who viewed or changed what (Parking lot; it would suit auditors well).

## Anti-goals (a failure even if everything else works)
- A partner user learns that another partner exists, or learns the name, id, count or existence of another partner's project or task. This includes error messages: someone else's project and a project that doesn't exist must look the same (404).
- A partner user sees a customer's details, or any customer not assigned to them.
- An auditor changes anything.
- A page that someone forgets to scope leaks data. The database must refuse, not just the code.

## Data model (decided with the owner: access belongs in the customer and project model)
- `workspace_member.role`: `admin | auditor | partner`, plus `partner_id`. A check constraint requires `partner_id` exactly when the role is `partner`.
- New `partner` table (id, workspace_id, name, created_at). *My call:* a table of its own rather than an organization kind (ADR-0004), so the access model doesn't depend on the directory, which partners can't see, or on the blocked task 040.
- New `customer_partner` (organization_id, partner_id; primary key on both). An organization and a partner must be in the same workspace.
- `project.partner_id`: null means internal. To make the owner a required, explicit property, `project.visibility` (`internal | partner`, not null) plus a check that `partner_id` is set exactly when visibility is `partner`, and that a partner project has a customer.
- `project.status` (`active | canceled`, not null, default `active`) and `project.copied_from_id` (nullable).
- `deleted_at`, `deleted_by` on `project`, `task`, `organization`, `organization_contact`, `organization_note` and `partner`.
- `workspace_invite.role` and `workspace_invite.partner_id`: a link creates an admin, an auditor, or a user of one partner.

## Enforcement (my call: defence in depth)
1. **One access rule in code.** A single module turns (user, workspace) into an access scope (role, partner) and provides SQL conditions such as "can see project", "can see customer name" and "can change project". Every query and action uses them, replacing `visibleTo`. Customer lookups for partners return only `{ id, name }`. Writes check the rules again on the server, inside the same transaction as the write.
2. **Postgres row-level security as the second lock.** Policies on `project`, `task`, `organization`, `organization_contact`, `organization_note`, `customer_partner` and `partner` mirror the same rule. The app sets the user for each request inside a transaction, so a query that forgets the code-level condition still returns nothing it shouldn't. The app's database role must not bypass RLS; migrations run as the owner role. This was parked in ADR-0005; this design brings it in. Partner users see customers only through a restricted path that exposes names only, such as a view or a narrower policy. The exact mechanism is left to the builder, as long as it is enforced in the database.
3. **Tests that try to leak.** A dedicated acceptance feature uses two partners sharing one customer, an auditor and an admin. For every page, link, form action (posting the other partner's ids), list, count, chart and "My tasks", it checks that nothing of the other partner's shows. DB-level tests run raw queries as a partner user with RLS on.

## What's left to the builder
- Page layout and wording for partner management, customer assignment, the Deleted view and role pickers.
- Splitting the single Cloud SQL `app` user into an owner role (migrations) and a runtime role that can't bypass RLS, through `infra/` Terraform.
- How the RLS user context is passed through the pool (for example, transaction-scoped `set_config`) and how it fits Drizzle.
- Navigation for partner users (for example, no Customers entry).
- The rollout split into tasks. A sensible order: ADR, schema and migration, access module and query switch-over, partner management and invites, partner experience, soft delete, RLS, leak suite (written alongside each step and completed at the end).

## Parking lot
- Purging soft-deleted items after a retention period.
- An audit log of reads and changes for auditors.
- Hiding the "Deleted" view behind a filter on lists instead of its own page.
