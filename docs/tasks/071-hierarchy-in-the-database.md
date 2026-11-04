# Task 071: Every project has a customer and a site, in the database; local data reset

- **Status:** in-progress
- **Milestone:** POC (2026-11-13)
- **Zone / package:** `packages/db` (migration 0035), `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/project-hierarchy.feature`; existing scenarios changed or retired (list below)
- **Depends on:** task 055 (done). Runs in parallel with task 070; task 072 follows it (it shares the e2e fixtures changed here). Part of the owner's 2026-11-04 request (tasks 070–072).

## Why
The hierarchy customer → (sub-company) → site → project is mandatory for the POC and must stick. Task 055 enforced it only in the forms, and older rows break it: the local database has ~10.6k projects, ~9k of them without a site and ~6k without a customer, nearly all left over from e2e runs. This task makes the database refuse such a project and clears the old data out of local databases. The demo data then fits the model.

## Rules (owner, 2026-11-04)
- **Enforced in the database:** every project has a customer (`organization_id`) and a site (`site_id`), both `NOT NULL`. `project_site_check` keeps the site to one of the customer's sites, or one of its sub-companies' (as now).
- **Existing rows:** projects without a customer or a site are removed.
- **What is retired:**
  - "internal" projects with no customer, and every scenario that depends on a project without a customer or site;
  - the "No customer" project filter.
- A project's **owner** (Internal or a partner, ADR-0006) is unrelated and stays: an Internal project still has a customer and a site.
- **Local reset:** wipe all workspaces, customers, sites and projects, and every e2e test user (email ending in `@example.com`), from the **local** database. Keep the real accounts, then re-run the demo seed. This is a guarded script, never a hand edit (CLAUDE.md rule 12).

## Scope
- **Schema (`packages/db/src/schema.ts`, migration 0035; regenerate the number if another lane merges a migration first):**
  - **Delete non-conforming rows:** the migration starts with `DELETE FROM project WHERE organization_id IS NULL OR site_id IS NULL`, so `SET NOT NULL` can run.
    - Tasks, crews, visits and attachment rows go with those projects (their foreign keys cascade).
    - `copied_from_id` on copies is set to null.
    - Stored attachment files of deleted projects stay in local storage (purging is already parked in task 059).
    - The SQL is added by hand to the generated migration before it is first applied, as task 055 did with its trigger.
  - **`project.organization_id` and `project.site_id` become `NOT NULL`.**
  - **Their foreign keys change from `ON DELETE SET NULL` to `ON DELETE NO ACTION`.**
    - `SET NULL` would now fail. Customers and sites are only ever soft-deleted (task 051). Their only hard delete is a whole workspace's cascade, which removes its projects in the same statement.
    - `NO ACTION` is checked at the end of the statement, so that cascade still works. Any other hard delete of a customer or site in use is refused.
    - `RESTRICT` would be checked too early inside the cascade.
  - **`project_site_check` loses its "site is null → accept" branch** (`CREATE OR REPLACE`; it can't be null any more). Nothing else changes in it, or in `organization_parent_check`: a sub-company still can't leave a parent whose projects are at its sites.
  - **Comments:** the ones on `project.organizationId`, `project.siteId` and `project_workspace_organization_idx` stop saying "cleared if deleted".
  - **Deployed databases:** none exists yet (task 068 is the first deploy). If 068 lands first, its database holds only demo data, which already fits (every demo project has a customer and a site), so the `DELETE` removes nothing. The PR shows the count it removed on a fresh `db:migrate` and on the local database.
- **Deleting a customer** (owner, 2026-11-04: refuse while it has projects):
  - A customer (or sub-company) can't be deleted while a project that isn't deleted is **for it** or **at one of its sites**. Canceled projects count, as they do for sites.
  - The delete page says "Projects for this customer or at its sites: <names>. Move or delete them first." and shows no "Yes, delete customer" button. `deleteCustomerAction` refuses the same way.
  - This replaces task 016/051's "deleting a customer keeps its projects". Under the new rule, that showed a project with "No customer" and no site.
  - The existing "Delete its sub-companies first: …" check comes first.
- **Restoring a project** (Deleted page, `restoreAction`):
  - "Restore its customer first" when its customer is deleted;
  - "Restore its site first" when its site is deleted.

  These are checked before `restore_project`. This closes task 055's parking-lot case: a project restored after its site was deleted showed "No site yet."
- **Projects list filter:**
  - The "Customer" select loses "No customer" (`NO_CUSTOMER`).
  - An old `?customer=none` link is ignored like any unknown value.
  - Sorting by customer no longer has a "no customer last" case.
- **Project page:** the "No customer" and "No site yet." fallbacks, and the "Add a site" link for a project without a site, go. They can't happen any more.
- **Types:** `organizationId` and `siteId` on a project are `string`, no longer `string | null`. Code that handled null on projects is simplified. A **task's** customer stays optional; that is a different field.
- **Local reset (`apps/dashboard/scripts/reset-local.ts`, `pnpm --filter @repo/dashboard reset:local`):**
  - **Refuses to run unless the database is local:**
    - `DATABASE_URL` is set, and its host is `localhost`, `127.0.0.1` or `::1`;
    - `CLOUD_SQL_CONNECTION_NAME` is not set;
    - `NODE_ENV` isn't `production`.

    Otherwise it prints why and exits with code 1. Lane databases (`app_lane<n>` on localhost) are allowed.
  - **Without `--yes` it is a dry run:** it prints what it would delete (workspaces, projects, customers, sites, users) and the accounts it keeps, by email.
  - **With `--yes`, in one transaction on the maintenance connection:**
    - delete every workspace (the cascade removes members, invites, partners, customers, sites, projects, tasks, visits and attachment rows);
    - then delete every user whose email ends in `@example.com` (their sessions and accounts cascade).

    Users with other emails are kept, with their sessions.
  - **Afterwards it prints the next steps:** open the dashboard once as the account to seed (this creates its personal workspace), then run `seed:demo --email <that account>`.
  - **Stored files:** the script doesn't touch the files in local storage.
  - **Docs:** CLAUDE.md "Commands" gets one line for `reset:local`. The owner approves that diff.
- **Demo seed:** it already fits. Every demo project has a customer (or sub-company) and one of that company's sites, and the Harborview sub-companies have their own sites (tasks 054–055). A unit test on `buildDemoPlan` checks it stays so: every project names a site of its own company. The rerun cleanup deletes projects before their customers, so `NO ACTION` doesn't block it. Check it after the migration.
- **Local run, once merged:** `pnpm db:migrate` (removes the ~9k non-conforming projects) → `reset:local --yes` → sign in once as each real account → `seed:demo --email <owner>`. The second real account then has an empty personal workspace. Invite it to the demo workspace again if it should share it: the reset removes all memberships.

### Existing scenarios changed or retired (one `docs(features):` commit, reasons in its body)
- **`customer-links.feature`:**
  - **Retired: "Deleting a customer keeps its projects"** (`@task:016`). A customer with projects can't be deleted now. It is replaced by "A customer with projects can't be deleted" in `project-hierarchy.feature`.
  - **Renamed: "A task in an internal project can point at a customer"** becomes "A task can point at another customer than its project's". "Internal Ops" already gets "Everyday Client" from the step (task 055), so only the name changes, because projects without a customer are gone.
  - **Changed: "Another user's customer can't be linked to a task"** (`@task:020`):
    - `And a project "Internal Ops" from before sites were required, with no customer or site` becomes `And I have a project named "Internal Ops"`.
    - The last line, `And I see the text "No customer"`, becomes `And "Everyday Client" is selected in "Customer"`. A new task gets its project's customer, and the refused save keeps it.
- **`project-list.feature`:**
  - **Background:** `And a project "Internal Ops" from before sites were required, with no customer or site` becomes `And I have a project named "Internal Ops"`. It is now for "Everyday Client" at "Everyday site", created after "Website Redesign", so "newest first" stays "Internal Ops, Website Redesign".
  - **Retired: "Projects without a customer"**, because there is no "No customer" filter.
  - **Changed: "Searching by name combines with the other filters":** `When I select "No customer" from "Customer"` becomes `When I select "Everyday Client" from "Customer"`. The expected texts stay.
  - **Changed: "Projects without a customer sort last"** becomes **"Sorting by customer"**: ascending shows "Website Redesign, Internal Ops" (Acme Ltd before Everyday Client); sorting again shows "Internal Ops, Website Redesign" with the column "descending".
- **`project-sites.feature`: retired "An older project without a site asks for one".** Such a project can't exist now.
- **`partner-access.feature`:**
  - **Changed: "Lists show only my partner's projects":** `the "Customer" select offers "Any customer, No customer, Acme Ltd"` becomes `"Any customer, Acme Ltd"`.
  - **Step change, no text change:** the Background's "the internal project "HQ Plan" has the task "Budget"" now gives HQ Plan the customer "Head Office", which is assigned to no partner, at its site "Head Office site".
- **`soft-delete.feature`:**
  - **Retired: "Deleting a customer hides its partner projects from the partner".** The admin can no longer delete "Acme Ltd" while "NW Site" is for it. Partners losing a customer's projects is still covered by `partner-access.feature` "Taking a customer away hides its projects". The database side (`partner_serves_customer` ignores deleted customers) stays covered by `soft-delete.db.test.ts`.
  - **Changed: "A contact or note comes back only after its customer":**
    - It starts with `Given the project "NW Site" was deleted by the admin` (an existing step), so the customer can be deleted.
    - The deleted items become "Acme Ltd (Customer), Call on Monday (Note), Jane Roe (Contact), NW Site (Project)".
    - The final `Then the admin's Deleted page is empty` becomes `Then the admin's deleted items are "NW Site (Project)"`.
- **Step changes only (no feature text change):**
  - **Removed steps:**
    - `a project {string} from before sites were required, with no customer or site`
    - `a project {string} for {string} from before sites were required, with no site`

    No scenario uses them after the changes above.
  - **Projects written straight to the database get a site of their customer, created once per customer as "<customer> site" when the scenario names none:**
    - `partner-access.steps.ts` `insertProject`;
    - `seed.steps.ts` "{string} has a project {string} for the customer {string}";
    - `workers.steps.ts`.

    "the project {string} is at the site {string}" still moves a project to a named site.

## Out of scope
- **Task 072:** the Customers table, site pages listing projects, and "New project" from a site.
- **Task 070:** the home page and the menu.
- Making a task's customer required.
- Purging stored files of removed projects.
- A database rule that a project that isn't deleted can't be at a deleted site or customer. That stays in the app: the delete and restore rules above, as for tasks and visits.

## Acceptance criteria
- [ ] The database refuses a project without a customer or a site, and the migration removes existing ones. (DB test `project-hierarchy.db.test.ts`; no Gherkin scenario: users can't reach it through the forms.)
- [ ] Deleting a workspace still deletes its projects, sites and customers. (DB test)
- [ ] A customer with projects can't be deleted until they are deleted. (`project-hierarchy.feature`: "A customer with projects can't be deleted")
- [ ] A sub-company whose sites have its parent's projects can't be deleted. ("A sub-company whose sites have projects can't be deleted")
- [ ] A deleted project comes back only after its customer and after its site. ("…only after its customer", "…only after its site")
- [ ] The projects filter has no "No customer" choice. ("The projects filter offers only customers")
- [ ] `reset:local` refuses a non-local database, does a dry run without `--yes`, and keeps only accounts that aren't `@example.com`. (unit tests on the guard and the kept-account rule; checked once by hand on the local database, output in the PR)
- [ ] Every changed scenario above passes; the retired ones are deleted.

## Approach (brief)
- **DB test first** (`packages/db/src/project-hierarchy.db.test.ts`):
  - inserting a project without `organization_id` or without `site_id` fails;
  - hard-deleting a site or customer in use fails;
  - deleting the workspace removes everything.

  Existing DB tests that insert projects without a customer or site (`access`, `hardening`, `attachments`, `site-visits`, `soft-delete`, `workers`, `project-sites`) get a customer and a site from a shared fixture helper.
- **`features/organizations/customer-in-use.ts`** (like `features/sites/site-in-use.ts`): `customerInUseMessage(names)` (unit tested), and a query listing the projects for a customer or at its sites. Both the delete page and the action use them.
- **`deleted/actions.ts`:** the project case reads its customer's and site's `deleted_at` first (unit tested where the order logic is pure).
- **`scripts/reset-local.ts`:** the guard is a pure function `isLocalDatabase(env)`, unit tested (localhost URL, remote host, Cloud SQL variables, production). The kept-account rule `isTestAccount(email)` is unit tested too.
- **No new ADR:** ADR-0008 already says every project has a site. The `ON DELETE` change is recorded in ARCHITECTURE ("Sites" paragraph: null no longer allowed; customers in use can't be deleted).

## Test plan
- **Acceptance:** `project-hierarchy.feature` (`@task:071`) and the changed scenarios.
- **New steps:**
  - `I delete the project {string}` (opens its page, "Delete project", confirms);
  - `I delete the site {string}`.

  The scenarios use the existing project-page steps where the wording already reads well.
- **DB:** `project-hierarchy.db.test.ts`, plus fixture updates in the existing DB tests.
- **Unit:** `customerInUseMessage`, the restore order, `isLocalDatabase`, `isTestAccount`, the demo plan's site rule.
- **Storybook:** none (no new components; the delete page's refusal reuses the existing layout).

## Open questions (owner)
1. **Deleting a customer that has projects:** it is refused until its projects are deleted or moved, as for a site in use. This changes task 016/051's "Deleting a customer keeps its projects" (the projects showed "No customer"). Approve, or should deleting a customer delete its projects with it, so that restoring the customer restores them too?
   - **Answer (owner, 2026-11-04):** refuse.

## Progress log
- 2026-11-04 – Drafted from the owner's request and answers (split from the home and menu work, task 070, and the hierarchy pages, task 072).
- 2026-11-04 – Approved by the owner; open question 1 answered: deleting a customer with projects is refused.
- 2026-11-04 – Red: the changed scenarios (own `docs(features):` commit), `@wip` off the five `project-hierarchy.feature` scenarios, steps for deleting a project and a site, projects written straight to the database get a site ("<customer> site" in the user's own workspace, "Main site" in the leak suite), `project-hierarchy.db.test.ts` plus customer-and-site fixtures (`db-test-fixtures.ts`) in the existing DB tests. Two open points for the planner: partner-access "I create a project for an assigned customer only, at one of its sites" can't hold as written (NW Site now needs a site of Acme Ltd, which the site select lists), and cancel/reopen of a partner's project at a site renders a blank page (project-cancel-copy).
- 2026-11-04 – Green. Migration 0035 (`0035_project_hierarchy.sql`) removed 9567 of 12291 projects on the local database and none on a fresh `db:migrate`. Then: customers in use can't be deleted (`customerInUseMessage`, `listProjectsOfCustomer`); a project is restored after its customer, then its site, then the site's sub-company (`projectRestoreBlock`; the third message, "Restore its site's customer first", covers a project at a deleted sub-company's site); "No customer" is gone from the filter, sorting and project page; `reset:local` (`isLocalDatabase`, `isTestAccount`) was dry-run on the local database and run with `--yes` on a throwaway local database only. Two fixes the new data showed. First, a refused task customer showed "No customer" (`edit-task-form`). Second, the blank page after Cancel / Reopen: joins on the security-barrier `customer_name` view checked every customer in the database, about 1.1 s per query. Every project now has a site, so the project page made two of them and the action's redirect took over 5 s. Labels are now read per record (`customerLabelOf`, `customer-label.db.test.ts`), about 2 ms. Unit 402, DB 114, e2e 279/279 (production build, 3 workers, 3.1 min).
- 2026-11-04 – Review fixes. Not every red run got its own `test:` commit: the tests for `reset:local` (060e11e), the edit-task customer (c31660d), `customerLabelOf` (0fd5424), `projectRestoreBlock` and `customerInUseMessage` were each seen failing first, but went in with their code. The fixes:
  - `isLocalDatabase` reads `DATABASE_URL` with pg-connection-string, so a `host` or `hostaddr` in the query string counts, and it accepts only the databases `app` and `app_lane<n>`.
  - `deleteCustomerAction` locks the customer and its sites (`for update`) before its checks, and a refused delete returns to the delete page.
  - Migration 0036: `project_site_check` leaves a null customer or site to `NOT NULL` (23502). The DB tests assert error codes: 23502, 23503 for hard deletes, 23514 for the trigger.
  - `customerLabelOf` tests cover partners, workers and deleted customers, and the plan assertion is a threshold.
  - The third restore message stays until the owner answers.
- Purging the stored files of projects removed by the migration or the reset (with task 059's purge item).
- A `reset:local` option that keeps the real accounts' workspaces and memberships, empties them, and seeds in one go.
- A database rule against a live project at a deleted site or customer, if the app rules prove not enough.
- DB tests create users at `@example.test` and some are left behind (`reset:local` keeps them as real accounts, e.g. `…-promoted@example.test`). Either clean them up in the tests or have `isTestAccount` include `example.test`.
- Other reads that join a security-barrier view per row (`site_choice`; customer choices filtered by workspace) may also scale with the whole database. Check them with `explain analyze` as a partner.
