# Task 072: Customers → sub-companies → sites → projects, page by page

- **Status:** in-review
- **Milestone:** POC (2026-11-13)
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/customer-hierarchy.feature`; two `@task:072` scenarios in `docs/features/partner-access.feature`; existing scenarios changed or retired (list below)
- **Depends on:** task 071 (merged first: it changes the leak-suite fixtures this task's scenarios use, and makes every project have a site). Part of the owner's 2026-11-04 request (tasks 070–072).

## Why
The POC walks the hierarchy from the top: a table of customers, then a customer and its sites (and sub-companies, each with its own sites), then a site and the projects there. The owner wants this path to be the obvious way through the app.

## Rules (owner, 2026-11-04)
- The **Customers table** lists **top-level** customers. A customer's page shows **its own sites** and **its sub-companies**, and each sub-company opens to its own sites. The path is Customer → (sub-company) → site → project.
- The **site page lists its projects**, each a link, with a way to start a new project at that site for those who may create projects.
- **Role visibility doesn't change:**
  - The Customers table and customer pages stay admins and auditors only (`canSeeCustomers`).
  - Partners and workers reach their projects through **All projects** and a project's Site section, as today. On a site page they see only the projects they can see.
  - The leak suite keeps every expectation.

## Scope
- **Customers page (`/dashboard/customers`): a table**, `role="table"` named "Customers".
  - **Rows:** top-level customers only (`parent_id is null`, not deleted), sorted by name. The status and tag filters apply to these rows. Sub-companies no longer get rows; they are reached from their parent's page.
  - **Columns** (*my call*):
    - **Customer:** the name as a link (the row header), with its tags as badges under it.
    - **Status**
    - **Sub-companies:** a count of those not deleted.
    - **Sites:** its own sites and its sub-companies' sites, not deleted.
    - **Projects:** projects for the customer or its sub-companies that I can see and that aren't deleted.
    - **Primary contact**
  - **Counts:** computed in SQL in the list query, with the access predicates (task 035 style).
  - **Empty and filtered states** keep today's texts.
- **Customer page:**
  - **Sites section:** shows **only the customer's own sites**. On a parent's page it no longer lists its sub-companies' sites (`listCustomerSites` without the sub-company rows; the `subCompanyName` link in `SitesSection` goes).
  - **Sub-companies section:** each row also shows its site count ("2 sites" / "1 site" / "No sites").
  - **Projects section:** unchanged. A parent still lists its sub-companies' projects (task 053).
- **Site page (`/sites/<id>`):**
  - **A new "Projects" section** (a region named "Projects") lists the projects at this site that I can see and that aren't deleted, newest first. It reuses `ProjectList`, so each row has a link, a status and progress.
  - **Empty:** "No projects at this site yet."
  - **"New project" link** to `/projects/new?site=<site id>`, shown when `canChange(role)` (admins and partners) and the site is one of my `site_choice` sites (`isSiteChoice`). So:
    - admins always get it;
    - a partner gets it only for a site of a customer assigned to them;
    - auditors and workers never do.
- **New project page:**
  - **`?site=<id>`:** when that id is one of my `site_choice` sites, it chooses the site and its own customer (the sub-company for a sub-company's site) in the form.
  - **Anything else is ignored**, like an unknown `?customer=`: an unknown id, another workspace's site, a deleted site, or a site I can't choose.
  - **When both are given**, `?site=` wins over `?customer=`.
- **Hierarchy shown on each page, as today:** "Part of <parent>" on a sub-company, "Site of <customer>" (with "Parent › Sub-company") on a site, and the customer and Site section on a project. No breadcrumbs are added (parked).

### Existing scenarios changed or retired (one `docs(features):` commit, reasons in its body)
- **`customer-groups.feature`:**
  - **Changed: "The customers list shows sub-companies under their parent"** becomes "The customers table lists top-level companies only". Its last line becomes `Then the customers listed are "Acme Ltd, Globex"` (owner decision 2).
  - **Retired: "A filtered list says which company a sub-company is part of"**, because sub-companies have no rows in the table.
  - **Changed: "A sub-company can't be restored before its parent".** The last line becomes `Then the customers listed are "Acme Ltd"`, followed by `When I am on the "Acme Ltd" customer page` and `Then the "Sub-companies" section shows "Acme Retail"`.
- **`sites.feature`: retired "A parent's page lists its sub-companies' sites too"** (`@task:054`). A parent's page lists only its own sites now (owner decision 2). Its checks move to `customer-hierarchy.feature` "From a customer through a sub-company and a site to a project", which also checks "Acme Ltd › Acme Retail" on the site page.
- **Step change, no text change:** "the customers listed are {string}" reads the row headers of the "Customers" table. The "(part of …)" form goes with the retired scenario.

## Out of scope
- Breadcrumbs (Customers › Acme Ltd › Acme Retail › Dizengoff store) on customer, site and project pages. Parked: they would add a second link with the same name as today's "Part of" and "Site of" links, which existing scenarios find by name.
- A Site column, filter or sort on the projects table (task 055 parking lot).
- Sorting the Customers table by column.
- Database rules (task 071); home page and menu (task 070).

## Acceptance criteria
- [x] The Customers table lists top-level customers with counts of sub-companies, sites and projects. (`customer-hierarchy.feature`: "The customers table lists top-level customers with their counts")
- [x] From the table, an admin opens a customer, a sub-company, a site and a project; a parent's page lists only its own sites. ("From a customer through a sub-company and a site to a project")
- [x] A site page lists its projects, and "New project" there chooses the site and its customer. ("A site lists its projects, and a new project starts there")
- [x] An unknown or another workspace's site in the new project link is ignored. ("A site the link can't use is ignored")
- [x] Partners see only their own projects on a site page; auditors see them all and can't start one. (`partner-access.feature`, `@task:072`)
- [x] Every changed scenario above passes; the retired ones are deleted.

## Approach (brief)
- **`listTopLevelCustomers(userId, workspaceId, filters)`** in `features/organizations/queries.ts`, with the three counts as SQL subqueries using the predicates and `deleted_at is null`.
  - `groupCustomers` is no longer used by the list page. Delete it if nothing else uses it.
- **`listSiteProjects(userId, siteId)`** in `features/projects/queries.ts` (`canSeeProject`, not deleted).
- **`initialCustomerAndSite(params, choices)`:** a pure function for the `?site=` / `?customer=` precedence, unit tested.
- **UI:**
  - **New:** `CustomersTable` in `features/organizations/` (with a story).
  - **Changed:** `SitesSection` (own sites only) and `SubCompaniesSection` (site count) stories.
  - **New:** `SiteProjectsSection` (with a story).
- **No ADR.**

## Test plan
- **Acceptance:** `customer-hierarchy.feature` (`@task:072`), the two `@task:072` scenarios in `partner-access.feature`, and the changed scenarios.
- **New steps:**
  - `I follow the {string} link in the {string} section`: a link inside a named region, because the same name can appear twice on a page;
  - `the {string} row shows {string} under {string}`: a table cell by row header and column header;
  - `I open the new project page for the other user's site`.
- **Unit:** `initialCustomerAndSite`, and the sub-company site-count label ("No sites" / "1 site" / "2 sites").
- **Storybook:** `CustomersTable` (empty, filtered empty, several rows with and without sub-companies), `SiteProjectsSection` (empty with and without "New project", several projects), `SitesSection` and `SubCompaniesSection` updated.

## Progress log
- 2026-11-04 – Drafted from the owner's request and answers (split from tasks 070 and 071).
- 2026-11-04 – Approved by the owner.
- 2026-11-04 – Red: scenarios changed/retired (`docs(features):`), `@wip` removed, steps written. 5 of 6 `@task:072` scenarios fail for the missing feature; "A site the link can't use is ignored" passes already (a guard: today `?site=` is ignored everywhere). The changed customer-groups scenarios and the primary-contact scenario in customer-contacts fail on the missing Customers table. Steps that opened a customer through the list now go by id (sub-companies have no row); "the auditor sees {string}" now checks visible text, not only the page title.
- 2026-11-04 – Green: `listTopLevelCustomers` (counts as subqueries by id, no view joins) and `CustomersTable`; customer pages list own sites only and each sub-company's site count; site pages list their projects with "New project" (`canStartProjectAt`, a `site_choice` lookup by id); `initialCustomerAndSite` picks the new project's customer and site. `groupCustomers` and `listOrganizations` removed; the tag filter lists top-level customers' tags. Unit and component tests first, then the 10 task and changed scenarios on a production build.
- 2026-11-04 – Note: the unit and component tests in c571c02 (`initialCustomerAndSite`, `siteCountLabel`, `CustomersTable`, `SiteProjectsSection`, `SubCompaniesSection`) were written and run red first, but went in with their code in one commit, with no separate red commit.
- 2026-11-04 – Review fixes:
  - The Projects count filters by the customer's workspace (`project_workspace_organization_idx`) and leaves out deleted sub-companies, like the other counts.
  - Cancel on a new project from `?site=` goes to the site only when I can see it (`can_see_site`), else to All projects (`newProjectCancelHref`, unit tested).
  - Step tidy-ups: the auditor text helper is shared, the dead "<site> (<sub-company>)" branch is gone, and the table-cell step no longer matches headers by substring.
  - The new leak-suite scenario in `workers.feature` ("A site page lists only my crew's projects at it") passed with no new step and no app change.
  - Full e2e: 284 of 284 on a production build. Status: in review.

## Parking lot
- Breadcrumbs showing the whole chain on customer, site and project pages.
- A Site column (and filter) on the projects table.
- Sorting the Customers table.
- Showing a sub-company's sites inline on its parent's page (expandable rows) instead of one more click.
