# Task 055: A project's site

- **Status:** done (PR #35)
- **Milestone:** M13 Sites & Field Data
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/project-sites.feature`; `@task:055` scenarios in `docs/features/partner-access.feature`; existing scenarios updated for the new rule (list below)
- **Depends on:** tasks 053 and 054; ADR-0008; design `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` (owner decisions 3 and 7, "Sites", "Access")

## Why
Every project is work at one physical site. The people doing the work, including partner technicians, need its address, how to get in and who to meet, right on the project.

## Rule (owner, 2026-11-02)
- Every new or edited project must have a **customer and one of its sites**. A project with no customer (internal work) is no longer possible in the form. Internal work gets an internal "customer" with its own sites.
- Existing projects without a site keep working. They show "No site yet." until someone edits them, and saving asks for a site.

## Scope
- **Schema (migration 0028):**
  - `project.site_id`: nullable (existing projects), references `site`, `ON DELETE SET NULL`, indexed.
  - A trigger refuses a site whose customer isn't the project's customer or one of its sub-companies, and a site in another workspace. It runs when `site_id` or `organization_id` changes.
- **Access (same migration):**
  - `can_see_site` also lets in anyone who can see a non-deleted project at the site (`can_see_project`): a partner sees the sites of their partner's projects.
  - `can_change_site` stays admins only.
  - A new `site_choice` security-barrier view (`id`, `workspace_id`, `organization_id`, `name`) lists the sites (not deleted, customer not deleted) whose customer's name the user may see (`can_see_customer_name`). The pickers read only this view, so a partner can choose sites of assigned customers without seeing their details. `SELECT` only for `app_user`.
- **Project form (new, edit, copy):**
  - **Customer select:** admins get a "Choose a customer" placeholder and no "No customer" choice. Partners keep today's select: their customers, the first one chosen.
  - **Site select:** "Choose a site", then the sites of the chosen customer and its sub-companies. A sub-company's site shows as "Dizengoff store (Acme Retail)" on its parent's list. The options follow the customer select (client-side filtering in the existing client form), and changing the customer resets the site.
  - **A customer without sites:** the form says "<customer> has no sites yet." For admins it adds an "Add a site" link (`/sites/new?customer=…`); partners are told to ask an admin.
  - **Server checks**, in this order after the name:
    - "Choose a customer" (missing);
    - the existing customer checks;
    - "Choose a site" (missing);
    - "Choose a site of this customer" (not one of the `site_choice` sites of that customer's group: another customer's, another workspace's, deleted or made up). A partner gets the same refusal for a made-up id as for a real one they can't see.
  - **Copy:** keeps the source's site when it suits the copy's customer.
- **Project page:** a "Site" section shows:
  - the site name, linked to the site page for anyone who can see it, which includes partners now;
  - the address, access notes and an "Open in maps" link;
  - the on-site contacts (read-only here).

  For a project without a site, it shows "No site yet." and, for those who can change the project, an "Add a site" link to its edit page.
- **Site page for partners:** the customer shows as plain text, not a link, for anyone who can't see the customer. There is no Edit, Delete or contact form, since `can_change_site` stays admins only.
- **Deleting a site in use** is refused. The delete page says "Projects at this site: <names>. Move them to another site first." and shows no confirm button, and `deleteSiteAction` refuses the same way. Deleted projects don't count; canceled ones do, since they keep their site (*my call*, approved).
- **Moving a sub-company** (task 053's "Part of") is refused when its parent's projects are at its sites: "Projects of <parent> are at its sites: <names>". Otherwise the trigger's rule would break.
- **Demo seed:** every demo project gets a site of its customer.

### Existing scenarios updated for the rule (separate `docs(features)` commit)
- **Add a site and choose it before creating or copying:**
  - `customer-groups.feature` "A project for a sub-company shows…"
  - `customer-links.feature` "A project for a customer shows…" and "Starting a project from a customer's page…"
  - `project-dashboard.feature` "Authenticated user creates a new project"
  - `dashboard-home.feature` "All projects page… creates new ones" (with a new step choosing the customer and site of an existing project)
  - `project-cancel-copy.feature` "A partner can only copy into their own partner"
  - `partner-access.feature` "A sub-company assigned to my partner…" and "I create a project for an assigned customer only, at one of its sites"
- `customer-links.feature` "An unknown customer in the new project link is ignored": the select now shows "Choose a customer", since "No customer" is gone.
- `project-list.feature` Background: "Internal Ops" is now a project from before sites were required, written straight to the database. A project with no customer can only exist that way now, so the "No customer" filter and sort stay covered.
- **Step changes (no feature text change):** "I have a project named …" gives the project a customer and site. It creates "Everyday Client" with "Everyday site" once per scenario when no customer is named. "… for customer …" picks or creates a site of that customer. Leak-suite projects written to the database stay without a site unless a scenario puts them at one.

## Out of scope
- Workers and crews (task 056).
- Listing a site's projects on the site page; filtering or sorting the projects table by site.
- Moving a project between sites in bulk.

## Acceptance criteria
- [ ] A new project needs a customer and one of its sites, and shows the site with its details and contacts. (`project-sites.feature`: "A new project is at one of…", "A new project needs…")
- [ ] The site choices follow the customer, including a parent's sub-company sites, and a customer without sites says how to add one. ("The site choices…", "A customer without sites…")
- [ ] Another customer's site is refused. ("Another customer's site…")
- [ ] An older project without a site asks for one when edited. ("An older project…")
- [ ] A copy keeps the site. ("A copy keeps the site")
- [ ] A site in use can't be deleted, and a sub-company whose sites the parent's projects use can't move. ("A site in use…", "A sub-company whose sites…")
- [ ] Partners see their project's site and contacts and open its page read-only; another partner's site stays not found; site choices are limited to assigned customers; a site of an unassigned customer is refused like a made-up id. (`partner-access.feature`, `@task:055`)
- [ ] Every existing scenario still passes with the updates listed above.

## Approach (brief)
- Migration and DB tests first. The trigger is `project_site_check`; `organization_parent_check` also refuses moving a sub-company whose sites its parent's (not deleted) projects use (`packages/db/src/project-sites.db.test.ts`): the trigger's refusals; `can_see_site` for a partner through their project and not through another partner's; `site_choice` for admin and partner.
- `features/sites/site-choices.ts`: `listSiteChoices(userId, workspaceId, partnerId)` (all choices with their customer group, for the client filter) and `isSiteChoice(...)` (the server check), the same pattern as `customer-names.ts`.
- `project-input.ts` gains `siteId` parsing (unit tested). `project-owner-check.ts` gains `siteAllowed(...)`.
- `siteOptionsFor(customerId, choices)` is a pure function the client form uses (unit tested): a group's own sites plus sub-company sites, labelled and sorted.
- No new ADR: ADR-0008 covers it.

## Test plan
- **Acceptance:** `project-sites.feature` (`@task:055`), the `@task:055` scenarios in `partner-access.feature`, and the updated scenarios.
- **New steps:**
  - `I have a project named {string} at the site {string}`
  - `I have a project named {string} for {string} at the site {string}`
  - `I open the copy page of the project {string}`
  - `I choose the site {string} in {string} by editing the page`
  - `a project {string} for {string} from before sites were required, with no site`
  - `a project {string} from before sites were required, with no customer or site`
  - `I choose the customer and site of {string}`
  - leak suite: `the project {string} is at the site {string}`, `I post the new project with the site id of {string}`
- **Unit:** `project-input.test.ts` (site), `site-options.test.ts`, demo plan.
- **Step helpers:** `e2e/steps/project-form.ts` (`createProject`, `chooseCustomerAndSite`): the project form steps choose a customer and a site, adding "Everyday Client" with "Everyday site" (or "<customer> site") to the database when needed. "<customer> has a site" now fills a made-up address, so the site has a maps link.
- **DB:** `project-sites.db.test.ts`.
- **Storybook:** `ProjectSiteSection` (with a site, with contacts, without a site with and without "Add a site") and `CustomerSiteFields` (the form's Customer and Site selects).

## Progress log
- 2026-11-02 – Drafted with the feature file (in review; new scenarios `@wip`). The owner chose "customer and site always" over allowing projects without a customer.
- 2026-11-02 – Approved. Migration 0028 (`project.site_id`, `project_site_check`, `can_see_site` for project viewers, `site_choice`); the project form's Customer and Site selects (`CustomerSiteFields`, `siteOptionsFor`, `customerAndSiteError`); the project page's Site section; the site page for partners (customer as text); site delete and sub-company move refusals; demo projects at sites. Red: DB tests (no `site_id`), unit tests, 12 of 13 `@task:055` scenarios (no Site select). Green: DB 71, unit 286 (dashboard), `@task:055` 13, full e2e (see PR).

## Parking lot
- A site page list of the projects at that site.
- Filtering the projects table by site.
- A project restored after its site was deleted shows "No site yet." (the site stays deleted); restoring could offer to restore the site too.
