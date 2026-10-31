# Partner Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins, auditors and partner companies share a workspace. Partners see only their own projects and the names of their assigned customers, and the database refuses everything else.

**Architecture:** Access rules are SQL functions defined once in a migration. App queries call them through `features/access/` predicates, and row-level security policies call the same functions as a second lock. The runtime pool runs as a restricted `app_user` role, and every query runs in a short transaction that sets `app.user_id`.

**Tech Stack:** Next.js 15 (App Router, server actions), Postgres 16 RLS, Drizzle, Better Auth, Vitest, Playwright + playwright-bdd.

**Spec:** `docs/superpowers/specs/2026-10-31-partner-access-design.md` · **ADR:** `docs/adr/0006-partner-access.md`

## Global Constraints
- Every repo rule in `CLAUDE.md` holds:
  - ATDD/TDD with a red run shown first.
  - Feature-file changes in their own `docs(features)` commit.
  - One task file per task in `docs/tasks/`, drafted from this plan when the task starts.
  - Fixed value sets as a `const` list with `parse…`/label helpers.
  - Query operators from `@repo/db`.
  - UI through `packages/ui` with stories.
- Roles: exactly `admin`, `auditor`, `partner` (labels "Admin", "Auditor", "Partner"). `member` no longer exists after task 046.
- Project visibility: `internal | partner`. Project status: `active | canceled` (labels "Active", "Canceled").
- Someone else's record and a record that doesn't exist must render the same `notFound()`, and actions must throw the same "Not found" error for both.
- Partners never receive any customer column except `id` and `name`.
- App code (`apps/*`, `packages/auth`) never imports `@repo/db/maintenance`. Only migrations, `scripts/`, e2e fixtures and DB tests do.
- Workspace delete stays a hard delete. Every other delete is soft.

## Review Focus
1. **Parallel queries in one page.** A page that runs 6+ queries in `Promise.all` must not hang under the pool's `max: 5`. Each `withAccess` takes a connection only for its own short transaction, and nested `withAccess` calls must reuse the outer transaction. Test: in task 047, a page-shaped `Promise.all` of 8 scoped queries resolves.
2. **Tampered ids in forms.** A partner posts another partner's `projectId`, `organizationId`, `assigneeId` or `partnerId` in a hidden field. Expected: the same refusal as for a made-up id, and nothing written. Test: leak suite, task 049.
3. **Totals and charts on the home page and "My tasks".** A partner's home counts must cover only their own visible projects. "My tasks" must stay correct for a user who is a partner in one workspace and an admin in another. Test: leak suite rows for `countWorkspaceOverview`, `countTasksByProjectAndStatus` and `listMyOpenTasks`, task 049.
4. **A form submitted after access was lost.** A customer is unassigned, or a partner is deleted, while a partner user has the project page open, and they then save a task. Expected: refused as not found, nothing written. Test: task 049 scenario "Saving after the customer was taken away is refused".
5. **An invite link of a deleted partner, or a link opened by an existing member.** Expected: the deleted partner's link is treated as invalid. An existing member gets "You're already a member of this workspace" and their role doesn't change. Tests: task 048 scenarios.

---

## File structure
- `packages/db/src/schema.ts`: new tables and columns (046).
- `packages/db/migrations/00NN_*.sql`: generated, plus hand-written SQL appended for functions, roles, policies and the view. That is allowed for a new, unapplied migration.
- `packages/db/src/maintenance.ts` (new, export `./maintenance`): `getMaintenanceDb()`, a pool without the role option (047).
- `packages/db/src/access.ts` (new): `withAccess(userId, fn)` and the AsyncLocalStorage for the current transaction (047).
- `packages/db/src/access.db.test.ts` (new): raw queries as each role with RLS on. Run by `pnpm --filter @repo/db test:db` in the CI `e2e` job (047).
- `apps/dashboard/features/access/` (new): `roles.ts` (moved from `features/workspaces/roles.ts`), `predicates.ts`, `scope.ts`, `require-change.ts` (046).
- `apps/dashboard/features/partners/` (new): queries, actions, forms (048).
- `apps/dashboard/app/partners/…` (new pages, admin only) (048); `app/deleted/page.tsx` (051).
- `docs/features/partner-access.feature` (new, the leak suite), `roles.feature`, `partners.feature`, `project-cancel-copy.feature`, `soft-delete.feature`.

---

### Task 046: Roles and the access model (admin and auditor)

**Files:**
- Modify: `packages/db/src/schema.ts`.
  - `workspaceMember`: `role` default `admin`, new `partnerId`.
  - New tables `partner` and `customerPartner`.
  - `project`: `visibility`, `partnerId`, `status`, `copiedFromId`.
  - `deletedAt` and `deletedBy` on project, task, organization, organizationContact, organizationNote and partner.
  - `workspaceInvite`: `role`, `partnerId`.
- Create: migration via `pnpm db:generate`, with appended SQL:
  - check constraints;
  - `update workspace_member set role='admin' where role='member'`;
  - `update workspace_invite set revoked_at=now() where revoked_at is null`;
  - the six access functions below.
- Create: `apps/dashboard/features/access/roles.ts`, `predicates.ts`, `scope.ts`, `require-change.ts`. Delete `features/workspaces/access.ts` (`visibleTo`) and move `features/workspaces/roles.ts`.
- Modify: every query file listed under **Interfaces**, every action, and every page that renders a form (to hide it from auditors).
- Test: `features/access/roles.test.ts`, `features/access/scope.test.ts`, `docs/features/roles.feature` + `e2e/steps/roles.steps.ts`.

**Interfaces:**
- Produces (SQL, in the migration; all `STABLE SECURITY DEFINER SET search_path = public`):
  - `access_role(p_user text, p_workspace text) returns table(role text, partner_id text)`: the membership. No row when the user's partner is soft-deleted.
  - `can_see_project(p_user text, p_project text) returns boolean`:
    - admin or auditor of the project's workspace: true, even when the project is deleted;
    - partner: requires all of the following:
      - same `partner_id`;
      - project not deleted;
      - `customer_partner` row for (project customer, partner);
      - customer not deleted;
      - partner not deleted.
  - `can_change_project(p_user, p_project)`: as above, but auditor → false, and deleted → false for everyone.
  - `can_see_customer(p_user, p_org)`: admin or auditor of the workspace.
  - `can_see_customer_name(p_user, p_org)`: `can_see_customer`, or a partner with a `customer_partner` row and neither side deleted.
  - `can_change_customer(p_user, p_org)`: admin only.
- Produces (TS, `features/access/roles.ts`): `WORKSPACE_ROLES = [{role:"admin",label:"Admin"},{role:"auditor",label:"Auditor"},{role:"partner",label:"Partner"}]`, `parseWorkspaceRole`, `workspaceRoleLabel`, `keepsAnAdmin` (unchanged behaviour).
- Produces (`features/access/predicates.ts`, each returning `SQL` that calls the function above):
  - `canSeeProject(userId: string, projectId: AnyColumn)`;
  - `canChangeProject(userId, projectId)`;
  - `canSeeCustomer(userId, orgId: AnyColumn)`;
  - `canSeeCustomerName(userId, orgId)`;
  - `canChangeCustomer(userId, orgId)`.
- Produces (`features/access/require-change.ts`):
  - `requireProjectChange(userId: string, projectId: string): Promise<void>` throws `Error("Not found")` unless `can_change_project`;
  - `requireCustomerChange(userId, orgId)` likewise;
  - `requireAdmin(userId, workspaceId)` throws `Error("Not found")` unless the user is an admin.
- Changes: `requireWorkspace` and `requireWorkspaceForAction` already return `workspace.role`. They now also return `workspace.partnerId: string | null`.
- Changes: list queries keep their names but take `userId` as the first argument and filter with the predicates:
  - `listProjects(userId, workspaceId, limit?)`;
  - `listCustomerProjects(userId, workspaceId, orgId)`;
  - `countProjects(userId, workspaceId)`;
  - `countTasksByProjectAndStatus(userId, workspaceId)`;
  - `countOverdueTasksByProject(userId, workspaceId, today)`;
  - `countWorkspaceOverview(userId, workspaceId, window)`;
  - `listCustomerOpenTasks(userId, workspaceId, orgId)`;
  - `listOrganizations(userId, workspaceId, kind, filter?)`;
  - `listOrganizationTags(userId, workspaceId, kind)`.
  - Every one also filters `deleted_at is null`.

- [ ] **Step 1: Write `roles.feature` (`@task:046`) and commit it as `docs(features)`.** Scenarios:
  - "An auditor sees every project and customer": an admin creates "Website Redesign" for "Acme Ltd" and invites an auditor; the auditor sees both, with the details and tasks.
  - "An auditor can't change anything": the auditor sees no "New project", "Edit project", "Add task" or "New customer" controls, and opening `/dashboard/projects/new` shows "Not found".
  - "An auditor's forms are refused": the auditor posts the update-project form directly (a step that submits the form through `page.evaluate`) and then sees the original name.
  - "Admins invite admins or auditors": the invite form has a "Role" select with "Admin" and "Auditor".
  - "An auditor sees the members list without controls": no "Remove", role select or invite form.
  - "Existing members are admins": the members page shows "Admin" for a member added before the migration (seeded through the maintenance connection in task 047; until then, through `getDb`).
- [ ] **Step 2: Write unit tests.**
  - `roles.test.ts`: `parseWorkspaceRole("member")` is `null`; `parseWorkspaceRole("auditor")` is `"auditor"`; `keepsAnAdmin` cases carried over.
  - `scope.test.ts`: `canChange({role:"auditor"})` is false; `canChange({role:"partner"})` and `canChange({role:"admin"})` are true. `canChange` is exported from `scope.ts` as `canChange(role: WorkspaceRole): boolean` and used by pages to hide forms.
- [ ] **Step 3: Run red.** `pnpm --filter @repo/dashboard test` fails because the modules don't exist. Run the e2e with `--grep @task:046`: all scenarios fail. Commit as `test(dashboard)`.
- [ ] **Step 4: Schema and migration.**
  - Edit `schema.ts`, then run `pnpm db:generate`.
  - Append the constraints, data updates and functions to the generated SQL.
  - Run `pnpm db:migrate`.
  - Check in psql: `select can_see_project('<admin id>', '<project id>')` is `t`.
- [ ] **Step 5: Switch every query and action to the predicates.**
  - Remove `visibleTo`.
  - Every action that writes a project or task calls `requireProjectChange`, every customer, contact or note write calls `requireCustomerChange`, and members, invites and settings call `requireAdmin`.
  - Pages hide forms with `canChange(workspace.role)`.
  - `/projects/new` and `/customers/new` call `notFound()` for auditors.
- [ ] **Step 6: Run green.** Unit, `@task:046`, then the full e2e (every existing scenario must still pass: their users are admins).
- [ ] **Step 7:** `pnpm lint && pnpm typecheck`, then commit as `feat(dashboard)`, plus a PR.

### Task 047: Row-level security as the second lock

**Files:**
- Create: `packages/db/src/access.ts`, `packages/db/src/maintenance.ts`, `packages/db/src/access.db.test.ts`, and `packages/db/vitest.db.config.ts` (picks `*.db.test.ts`).
- Modify: `packages/db/src/client.ts`. The pool sets `options: "-c role=app_user"`, and `getDb()` returns the current `withAccess` transaction when one is active.
- Modify: `packages/db/package.json`:
  - export `./maintenance`;
  - script `test:db` = `dotenv -e ../../.env -- vitest run -c vitest.db.config.ts`.
- Modify: `.github/workflows/ci.yml`, `e2e` job: run `pnpm --filter @repo/db test:db` after `pnpm db:migrate`.
- Modify: ESLint config. `no-restricted-imports` for `@repo/db/maintenance` in `apps/**` and `packages/auth/**`, except `apps/dashboard/scripts/**`.
- Modify: `e2e/steps/seed.steps.ts`, `apps/dashboard/scripts/seed-demo.ts` → `getMaintenanceDb()`.
- Modify: every query function in task 046's Interfaces list, every `get…ForUser`, and every action, to run inside `withAccess(session.user.id, …)`.
- Create: a migration with:
  - `create role app_user nologin` (guarded by `do $$ … if not exists`);
  - `grant app_user to current_user`;
  - `grant select, insert, update, delete on all tables in schema public to app_user`, plus default privileges;
  - `alter table … enable row level security; alter table … force row level security` on `project`, `task`, `organization`, `organization_contact`, `organization_note`, `partner`, `customer_partner`, `workspace_member`, `workspace_invite` and `workspace`;
  - the policies;
  - the view `customer_name`.
- Note on customer names: partners must not select `organization` rows at all. The `organization` SELECT policy is `can_see_customer(current_setting('app.user_id', true), id)`, which is admins and auditors only. Partners read names through `customer_name` (`create view customer_name with (security_barrier) as select id, workspace_id, name from organization where can_see_customer_name(current_setting('app.user_id', true), id)`). The view is owned by the migration user, so it bypasses the `organization` policy and applies its own filter. Grant `select` on it to `app_user`.

**Interfaces:**
- Produces (`@repo/db`):
  - `withAccess<T>(userId: string, fn: () => Promise<T>): Promise<T>`: opens a transaction, runs `select set_config('app.user_id', $1, true)`, stores the transaction in an `AsyncLocalStorage`, and runs `fn`. When a transaction is already active it just runs `fn` (no nesting).
  - `getDb()` returns that transaction inside `withAccess`, and otherwise the pool, where policies see no user and return nothing.
  - `schema.customerName` (Drizzle `pgView(...).existing()`).
- Produces (`@repo/db/maintenance`): `getMaintenanceDb()`, a pool without the role option, for migrations-adjacent scripts and tests only.
- Policies, each `using` and, for writes, `with check`:
  - `project`: select `can_see_project(uid, id)`; insert, update, delete `can_change_project(uid, id)`. For insert, the check runs on the new row, so it uses an inline expression instead: an admin of `workspace_id`, or a partner whose `partner_id` and customer assignment match.
  - `task`: select `can_see_project(uid, project_id)` and (`deleted_at is null` or the user is an admin or auditor); writes `can_change_project(uid, project_id)`.
  - `organization`, `organization_contact`, `organization_note`: select `can_see_customer`; writes `can_change_customer`.
  - `partner`, `customer_partner`: select for admins and auditors of the workspace, and for a partner user's own `partner` row; writes admin only.
  - `workspace_member`: select for own rows; all rows for admins and auditors; for a partner, rows of their own partner plus admins (the people they can assign). Writes: admin only, plus deleting one's own row (leave).
  - `workspace_invite`: admin only, plus a select by `token_hash` for joining, done through a `SECURITY DEFINER` function `find_invite(p_token_hash text)`.
  - `workspace`: select for members; update and delete for admins; insert for anyone (creating a workspace).
- Better Auth tables have no RLS. They only need the grants.

- [ ] **Step 1: Write `access.db.test.ts`.**
  - Fixtures through `getMaintenanceDb()`: one workspace with an admin, an auditor, partner A (user `pa`) and partner B (user `pb`); a customer `Shared` assigned to A and B; a customer `OnlyB` assigned to B; project `PA1` (A, Shared), project `PB1` (B, Shared), and an internal project `INT`.
  - Each test runs raw SQL through `withAccess(user, () => getDb().execute(sql`…`))`.
  - `it("shows partner A only its own project")`: `select id from project` as `pa` → `[PA1]`.
  - `it("hides customers from partners entirely")`: `select * from organization` as `pa` → `[]`.
  - `it("gives partners names of assigned customers only")`: `select name from customer_name` as `pa` → `["Shared"]`.
  - `it("refuses a partner's update of another partner's project")`: `update project set name='x' where id=PB1` as `pa` → 0 rows. Then, through maintenance, the name is unchanged.
  - `it("refuses a partner's insert into another partner")`: inserting a project with `partner_id=B` as `pa` throws an RLS violation.
  - `it("refuses every write by an auditor")`: inserts, updates and deletes on project, task and organization each affect 0 rows or throw.
  - `it("shows nothing without withAccess")`: `getDb().execute(sql\`select id from project\`)` → `[]`.
  - `it("hides projects after the customer is unassigned")`: delete `customer_partner(Shared, A)` → `pa` sees `[]`.
  - `it("hides other partners' members")`: `select user_id from workspace_member` as `pa` → only `pa` and the admin.
  - `it("handles 8 parallel scoped queries with a pool of 5")`: `Promise.all` of 8 `withAccess` selects resolves within 5s.
- [ ] **Step 2: Run red.** `pnpm --filter @repo/db test:db`: it fails (`withAccess` is missing).
- [ ] **Step 3:** Implement `access.ts`, `maintenance.ts` and the client change, then the migration. Run `pnpm db:migrate`.
- [ ] **Step 4:** Wrap every query and action in `withAccess`, and move seeds and fixtures to maintenance. Run the DB tests to green.
- [ ] **Step 5:** Full unit and e2e suites (no behaviour change), then lint and typecheck. Commit as `test(db)` and then `feat(db)`, plus a PR.

### Task 048: Partner companies, customer assignment and partner invites (admin side)

**Files:**
- Create: `apps/dashboard/features/partners/queries.ts`, `actions.ts`, `partner-form.tsx`, `assign-customer-form.tsx`.
- Create: `app/partners/page.tsx`, `app/partners/new/page.tsx`, `app/partners/[partnerId]/page.tsx`.
- Modify: the invite form and `createInviteAction` (role select: Admin, Auditor, or "Partner: <name>"); `joinWorkspaceAction` / `findInvite`; `changeRoleAction` and `features/workspaces/members.ts` (`changeMembership`); the header nav (Partners link for admins and auditors).
- Test: `docs/features/partners.feature` + `e2e/steps/partners.steps.ts`; `features/partners/partner-name.test.ts`.

**Interfaces:**
- Consumes: the task 046 predicates, `requireAdmin` and `withAccess`.
- Produces:
  - `listPartners(userId, workspaceId): Promise<{id,name,userCount,customerCount}[]>`;
  - `getPartnerForUser(userId, partnerId)`;
  - `createPartnerAction(prev, formData) → FormState`, which redirects to `/partners/<id>`;
  - `assignCustomerAction`, `unassignCustomerAction`;
  - `parsePartnerName(value) → {ok:true,name} | {ok:false, field:"name", error}`, which mirrors `workspace-name.ts`.
- Behaviour:
  - A partner invite link makes a `partner` membership with that `partner_id`.
  - An existing member who opens any link sees "You're already a member of this workspace", and nothing changes.
  - `changeMembership` accepts `{ role, partnerId }`. When the role or partner changes, it clears `task.assignee_id` for that user on tasks where `can_see_project` becomes false, in the same transaction.

- [ ] **Step 1: Write `partners.feature` (`@task:048`) and commit it as `docs(features)`.** Scenarios:
  - "An admin creates a partner and assigns customers": the partner page lists "Acme Ltd".
  - "A blank partner name shows an error".
  - "A partner invite link makes a partner user": the members page shows "Partner: Northwind".
  - "Someone already in the workspace opens a partner link": they see "You're already a member of this workspace", and the members page still shows them as "Admin".
  - "Changing a user's partner clears assignments they can no longer see".
  - "Auditors see partners but can't change them".
  - "Partners pages are not found for partner users".
- [ ] **Step 2: Write the `parsePartnerName` unit tests:** blank → error "Enter a name"; more than 100 characters → error "Use at most 100 characters"; surrounding whitespace is trimmed.
- [ ] **Step 3: Run red** (unit and `--grep @task:048`), then commit as `test(dashboard)`.
- [ ] **Step 4: Implement.** Admin pages use the same Card/Form/`FormState` patterns as `customers/new`.
- [ ] **Step 5:** Green, full suites, lint and typecheck. Commit, plus a PR.

### Task 049: The partner experience, and the leak suite

**Files:**
- Modify:
  - `app/projects/new/page.tsx` and `features/projects/actions.ts`: the owner is set from the scope, and admins get an "Owner" select ("Internal" or a partner).
  - `features/projects/project-form.tsx`: the customer options come from `customer_name`.
  - `features/projects/queries.ts`: `customerName` is joined from `schema.customerName`, not `organization`.
  - `features/tasks/actions.ts`: rule 7a, a task's customer in a partner project must have `can_see_customer_name` for the partner.
  - `features/tasks/queries.ts`: a task's customer name comes from `customerName`.
  - `listMemberOptions`: assignee options are the partner's users plus admins.
  - The header nav: no Customers link for partners.
  - Every `app/customers/**` page: `notFound()` for partners. That already holds through RLS, which this task makes explicit and tests.
- Create: `docs/features/partner-access.feature` + `e2e/steps/partner-access.steps.ts` (two partners sharing one customer, built with the maintenance connection to keep runs fast).

**Interfaces:**
- Consumes: everything from tasks 046–048.
- Produces: the `@task:049` leak suite, which every later task extends when it adds a page or action.

- [ ] **Step 1: Write `partner-access.feature` (`@task:049`) and commit it as `docs(features)`.** The Background has partners "Northwind" and "Globex", customer "Acme Ltd" assigned to both, Northwind's project "NW Site" with task "Copy", and Globex's project "GX App" with task "Login". Scenarios, all run as a Northwind user:
  - "Lists show only my partner's projects": All projects, Home, the tiles view and the filters all show only "NW Site".
  - "Home totals count only my projects": "1 project", and only my tasks in the status chart.
  - "Another partner's project link is not found": opening GX App's URL and its task URL both show "Not found".
  - "Another partner's ids in forms are refused": the create-task form posted with GX App's `projectId`, the project form with an unassigned customer's id, and the task form with a Globex user as assignee each show the same refusal as a made-up id, and nothing is created.
  - "I see customer names but no customer pages": the project page shows "Acme Ltd" as text, not a link; `/dashboard/customers` and Acme's URL show "Not found"; there's no Customers nav link.
  - "I create a project for an assigned customer only": the Customer select lists only "Acme Ltd".
  - "Taking a customer away hides its projects": after an admin unassigns Acme from Northwind, the list is empty and NW Site's URL is "Not found". The admin still sees NW Site.
  - "Saving after the customer was taken away is refused".
  - "My tasks shows only what I can see": the user is also an admin in their own workspace.
  - "An auditor sees both partners' projects".
- [ ] **Step 2: Run red** (`--grep @task:049`), then commit as `test(e2e)`.
- [ ] **Step 3: Implement** the changes listed under Files.
- [ ] **Step 4:** Green, then the full suites, `test:db`, lint and typecheck. Commit, plus a PR.

### Task 050: Cancel a project, or copy it to a new one

**Files:**
- Create: `features/projects/project-lifecycle.ts`: `PROJECT_LIFECYCLE = [{status:"active",label:"Active"},{status:"canceled",label:"Canceled"}]`, `parseProjectLifecycle`, `projectLifecycleLabel`.
- Create: `features/projects/copy-project.ts`: `copyProjectAction(prev, formData) → FormState`, which redirects to the new project.
- Create: `app/projects/[projectId]/copy/page.tsx`.
- Modify:
  - `features/projects/project-status.ts`: add `canceled` to `PROJECT_STATUSES` (label "Canceled") so it shows in the filter and table, and add `projectStatus(counts, lifecycle)` → `"canceled"` when canceled.
  - The project page: "Cancel project" / "Reopen project" buttons and a "Copy to new project" link.
  - `app/projects/page.tsx`: pass the lifecycle.
- Test: `project-lifecycle.test.ts`, the `project-status.test.ts` additions, and `docs/features/project-cancel-copy.feature`.

**Interfaces:**
- `copyProject(userId, sourceId, { name, ownerPartnerId: string | null, customerId }): Promise<string>` (new id) runs in one `withAccess` transaction. It copies tasks that aren't deleted, with title, description, status, priority and due date. It sets `assignee_id` to null. It keeps a task's customer only when `can_see_customer_name` holds for the new owner. It sets `copied_from_id`.
- Partners can copy only into their own partner. Admins can copy to any owner.

- [ ] **Step 1: Write the feature and commit it as `docs(features)`.** Scenarios:
  - "Cancelling a project shows it as Canceled": the table row shows "Canceled", and the Status filter has "Canceled".
  - "Reopening a canceled project".
  - "An admin copies a partner's project to another partner": the new project has the tasks, with no assignees. The original is still listed.
  - "A partner can only copy into their own partner": the Owner select is absent.
  - "A task customer the new owner can't see is dropped in the copy".
  - "An auditor can't cancel or copy".
  - Extend `partner-access.feature`: "Another partner's project can't be copied".
- [ ] **Step 2: Write the unit tests:** `projectStatus([{status:"done",count:2}], "canceled")` is `"canceled"`; `parseProjectLifecycle("archived")` is `null`.
- [ ] **Step 3:** Red, then implement, then green, the full suites and a PR.

### Task 051: Soft delete everywhere, the Deleted view and restore

**Files:**
- Modify: every delete action. `deleteProjectAction`, `deleteTaskAction`, `deleteTaskFromPageAction`, `deleteCustomerAction`, `removeContactAction` and `deleteNoteAction` now `update … set deleted_at = now(), deleted_by = userId`.
- Create: `deletePartnerAction`, `restoreAction(formData)` (with `kind` one of `project | task | customer | contact | note | partner`), and `features/deleted/queries.ts` (`listDeleted(userId, workspaceId)`).
- Create: `app/deleted/page.tsx`, for admins and auditors; Restore buttons for admins only.
- Modify: every list and detail query adds `isNull(x.deletedAt)`, except `listDeleted` and the partner rules already in the SQL functions.
- Remove: the `ON DELETE CASCADE` reliance for contacts and notes on customer delete (a soft delete doesn't cascade).
- Test: `docs/features/soft-delete.feature`; the `restoreAction` kind parser in `features/deleted/deleted-kind.test.ts`.

**Interfaces:**
- `DELETED_KINDS` const list with labels (Project, Task, Customer, Contact, Note, Partner), and `parseDeletedKind`.
- Deleting a project hides its tasks through `can_see_project` and the list filters. Restoring it brings them back. Tasks deleted on their own stay deleted.

- [ ] **Step 1: Write the feature and commit it as `docs(features)`.** Scenarios:
  - "A deleted project disappears and can be restored with its tasks".
  - "A deleted task can be restored".
  - "Deleting a customer hides its partner projects from the partner": an admin still sees them, and restoring the customer brings them back.
  - "Deleting a partner removes its users' access": the user sees an empty workspace list or their personal workspace. The partner's invite link says "This invite link is no longer valid". Restoring the partner restores their access.
  - "Auditors see the Deleted page without Restore".
  - "Partners never see deleted items or the Deleted page".
  - Extend `partner-access.feature`: "A deleted project of another partner stays not found".
- [ ] **Step 2: Write unit tests** for `parseDeletedKind`.
- [ ] **Step 3:** Red, then implement, then green. Then the full suites and `test:db` (add `it("hides deleted projects from partners but not admins")`). Then a PR.

### Milestone close
- [ ] Update `docs/PLAN.md`: M12 done, a change-log line, the open risks (policy cost on large lists, the audit log follow-up).
- [ ] Update `docs/ARCHITECTURE.md`: the access section points to ADR-0006, `withAccess` and the maintenance connection rule.
