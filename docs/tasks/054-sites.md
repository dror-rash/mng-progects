# Task 054: Sites and on-site contacts

- **Status:** todo (feature file in review)
- **Milestone:** M13 Sites & Field Data
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/sites.feature`, plus two `@task:054` scenarios in `docs/features/partner-access.feature`
- **Depends on:** task 053; ADR-0008 ("Sites", "Access"); design `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` (owner decisions 2, 7 and 8; "Sites")

## Why
Projects happen at physical places. Technicians need the address, how to get in, and who to meet there. A site belongs to a customer or a sub-company. Task 055 links each project to one site.

## Scope
- **Schema (migration 0027):**
  - `site`: `id`, `workspace_id`, `organization_id` (a customer or sub-company in the same workspace), `name`, `address`, `access_notes`, `latitude`, `longitude` (both nullable `numeric`; a check constraint keeps them both set or both empty, and in range), timestamps, `deleted_at`/`deleted_by`, `created_by`. Indexed by organization.
  - `site_contact`: `id`, `site_id`, `name`, `role`, `phone`, `email`, timestamps, soft-delete columns.
  - The site's workspace must be its organization's workspace (composite foreign key, as `customer_partner` does). A site's customer is fixed once created (*my call*: moving a site between customers would break task 055's rule that a project's site belongs to its customer).
- **Access (same migration):**
  - `can_see_site(user, site)`: admins and auditors of the site's workspace, while the site and its customer aren't deleted. Task 055 adds partners and workers for the sites of their projects.
  - `can_change_site(user, site)`: admins, same conditions.
  - Row-level security on `site` and `site_contact` calls these functions. Partners can't read either table.
  - Predicates in `features/access/predicates.ts` (`canSeeSite`, `canChangeSite`) and `requireSiteChange` in `require-change.ts`.
- **Pages:**
  - **Customer page:** a Sites section listing the customer's sites and, on a parent's page, its sub-companies' sites with the sub-company's name. Admins get a "New site" link. Each row shows the name and the address.
  - **`/sites/new?customer=<id>`** (admins): Site name, Address, Access notes, Latitude, Longitude. A customer the admin can't see shows "Customer not found".
  - **`/sites/<id>`:**
    - The name, its customer ("Parent › Sub-company", a link), the address, the coordinates, access notes, and an "Open in maps" link.
    - The map link goes to `https://www.google.com/maps/search/?api=1&query=…`, with the coordinates when set, else the address. It opens in a new tab with `rel="noopener noreferrer"`.
    - An "On-site contacts" section: add, edit and remove contacts, reusing the contact input parser.
    - "Edit site" and "Delete site" for admins.
    - Not found ("Site not found") for anyone who can't see it, the same as a made-up id.
  - **`/sites/<id>/edit`, `/sites/<id>/delete`:** admins only.
  - **`/sites/<id>/contacts/<contactId>/edit`:** admins only.
- **Validation (`features/sites/site-input.ts`):**
  - The name is required ("Site name is required"), with length limits as for customers.
  - Latitude must be between -90 and 90 ("Enter a latitude between -90 and 90"), and longitude between -180 and 180 ("Enter a longitude between -180 and 180").
  - Both coordinates or neither ("Enter both latitude and longitude, or neither").
  - The form returns `FormState` errors on the right field.
- **Soft delete:**
  - Deleting a site hides it and its contacts.
  - A deleted customer hides its sites, which come back with it.
  - The Deleted page gets the kinds Site and Site contact. Restoring checks the parent: "Restore its customer first" for a site, and "Restore its site first" for a site contact.
- **Demo seed:** each demo customer gets one or two sites with an on-site contact, and the Harborview sub-companies get a site each.

## Out of scope
- Linking projects to sites, the required site picker, `site_choice`, and partners seeing sites: task 055.
- Moving a site to another customer; site tags; a map view (design parking lot).
- Geocoding addresses into coordinates.

## Acceptance criteria
- [ ] An admin adds a site from the customer's page, with an address, access notes and a maps link. (`sites.feature`: "Add a site…")
- [ ] A parent's page lists its sub-companies' sites, and a site shows "Parent › Sub-company". ("A parent's page lists…")
- [ ] Coordinates are optional and checked; a name is required. ("Coordinates…", "Only one coordinate…", "A site needs a name")
- [ ] On-site contacts can be added, edited and removed, and are separate from the customer's contacts. ("Add, edit and remove…", "On-site contacts are separate…")
- [ ] Delete and restore keep sites with their customer. ("Delete a site and restore it", "A deleted customer's sites…", "A site can't be restored before its customer")
- [ ] Other workspaces' sites and customers stay not found. ("Another workspace's site…", "A new site can't be started…")
- [ ] Partners can't open sites; auditors see sites read-only. (`partner-access.feature`, `@task:054`)

## Approach (brief)
- Migration and DB tests first (`packages/db/src/sites.db.test.ts`): the policies for admin, auditor and partner; the coordinate and workspace constraints; a deleted customer hiding its sites.
- `features/sites/`: `site-input.ts` (unit tested), `queries.ts`, `actions.ts`, a `site-form.tsx` client form, and a `site-contacts-section.tsx` that follows `contacts-section.tsx`. The contact form is generalized only if it stays simple; otherwise it is a site-specific copy that uses the shared `contact-input.ts`.
- `features/sites/maps-link.ts`: a pure function that builds the maps URL (unit tested: coordinates win, the address is encoded, and there is no link with neither).
- No new ADR: ADR-0008 covers it.

## Test plan
- **Acceptance:** `docs/features/sites.feature` (`@task:054`) and two `@task:054` scenarios in `partner-access.feature`. New steps: `{string} has a site {string}`, `the site {string} has a contact {string}`, `I open the {string} site page`, `I open the new site page for {string}`, `the sites listed are {string}`, `the URL path is the {string} customer page`, `I keep the link to the {string} site` / `I open the kept site link`, `another user has a customer {string} with a site {string}`, `I open the other user's site page`, `I open the new site page for the other user's customer`, the leak-suite `the customer {string} has the site {string} with the contact {string}` and `I open the address of the site {string}`, plus auditor steps for site pages.
- **Unit:** `site-input.test.ts`, `maps-link.test.ts`, deleted-kind additions, and the seed plan.
- **DB:** `sites.db.test.ts`.
- **Storybook:** `SitesSection` (empty with and without "New site", own sites, with sub-company sites) and `SiteContactsSection` (empty, several contacts, read-only).

## Progress log
- 2026-11-02 – Drafted with the feature file (in review; scenarios `@wip`).

## Parking lot
- Moving a site to another customer (after task 055, with a rule for its projects).
- Site tags and a map of all sites.
