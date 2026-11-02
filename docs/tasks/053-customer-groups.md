# Task 053: Customer groups (sub-companies)

- **Status:** in-review
- **Milestone:** M13 Sites & Field Data
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/customer-groups.feature`, plus three `@task:053` scenarios in `docs/features/partner-access.feature`
- **Depends on:** ADR-0008 (decisions "Hierarchy" and "Access"), design `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` (owner decisions 1 and 5, "Organization hierarchy")

## Why
Customers are often large organizations with sub-brands or sub-companies. Each sub-company has its own details, contacts and notes, and projects belong to a specific one. Sites (task 054) hang off either level, so the hierarchy comes first.

## Scope
- **Schema:** `organization.parent_id` (nullable, references `organization`, `ON DELETE SET NULL`, so a workspace's hard delete still cascades), indexed. Migration 0026 adds a trigger that refuses:
  - a parent in another workspace or of another kind;
  - a parent that has a parent itself;
  - a parent for a row that has children of its own (deleted children count too, so a restore can't make two levels);
  - the row itself as its own parent.
- **Customer form:** a "Part of" select ("None", then companies that can be parents: top-level customers in the workspace, not deleted, not this one).
  - On a company with sub-companies, the select offers only "None", and the form says "<name> has sub-companies, so it can't be part of another company."
  - `/customers/new?parent=<id>` preselects the parent.
  - The parser returns `undefined` when the field is absent, `null` for "None", and `{ ok: false, field: "parentId", error: "Choose a company from the list" }` for anything the select wouldn't offer (another workspace, a sub-company, a deleted company, a made-up id). The trigger is the second lock.
- **Customer page:**
  - A sub-company shows "Part of <parent link>", and the breadcrumb shows Customers › parent.
  - A top-level company gets a "Sub-companies" section listing its children (name, status, primary contact) and, for admins, a "New sub-company" link.
  - A parent's Projects and Open tasks include its sub-companies' work, with the customer column shown.
  - Contacts and notes stay per company.
- **Customers list:** unfiltered, each parent is followed by its sub-companies, indented and labelled "part of <parent>". With a status or tag filter, matching rows are listed flat, and sub-companies keep the "part of <parent>" label.
- **Names everywhere:** a sub-company shows as "Parent › Sub-company" in every customer picker (project, task, filter, partner assignment), in project and task lists, and on project and task pages. The `customer_name` view gets `parent_name` and `label` columns (migration 0026, `CREATE OR REPLACE` keeps the grants), and every name read there uses `label`. The partner page builds the same label from `organization` (admins and auditors).
- **Delete and restore:**
  - The delete page of a company with sub-companies that aren't deleted shows "Delete its sub-companies first: <names>" and no confirm button. `deleteCustomerAction` refuses the delete the same way.
  - Restoring a sub-company whose parent is still deleted gets "Restore its parent first", in the existing task-051 restore check.
- **Partners:** assignment stays per organization (`customer_partner`), so a parent doesn't cover its sub-companies. The assign picker lists sub-companies with their label. No access function changes, and the leak suite gets the three partner scenarios.
- **Demo seed:** one of the five demo customers gets two sub-companies, with some of its projects on them.

## Out of scope
- Sites (task 054). Per-company sites and the site picker come there.
- More than one level, and sub-companies of other organization kinds (task 040).
- Rolling up a parent's contacts and notes, or editing sub-companies in bulk.

## Acceptance criteria
- [x] An admin adds a sub-company from the parent's page; it has its own details, contacts and notes. (`customer-groups.feature`: "Add a sub-company…", "A sub-company has its own contacts and notes")
- [x] The customers list shows sub-companies under their parent, and filtered lists say which company each is part of. ("The customers list…", "A filtered list…")
- [x] Projects for a sub-company show on its page and its parent's page, and pickers label it "Parent › Sub-company". ("A project for a sub-company…")
- [x] Only one level: a sub-company can't have sub-companies, and a company with sub-companies can't become part of another. ("A sub-company can't have…", "A company with sub-companies can't become…")
- [x] A sub-company can move to another parent or become independent. ("Move a sub-company…")
- [x] Delete and restore keep the hierarchy whole. ("…can't be deleted before them", "…can't be restored before its parent")
- [x] Tampered or cross-workspace parents are refused with a field error. ("A tampered parent…", "Another workspace's customer…")
- [x] Partners: a parent doesn't give its sub-companies; a sub-company assigned on its own shows with its parent's name, and partners see names only; removing it hides its projects. (`partner-access.feature`, `@task:053`)

## Approach (brief)
- Schema and migration first, with a DB test for every refusal the trigger makes (`packages/db/src/customer-groups.db.test.ts`).
- `features/organizations/organization-input.ts` gains `parentId` parsing. A query helper `listParentChoices(userId, workspaceId, excludeId)` serves both the select and the server check, the same pattern as `isCustomerChoice`.
- List grouping is a pure function (`groupCustomers(rows)`: parents in name order, each followed by its children; orphans can't occur), unit tested.
- The new UI is small: `PartOfField` and `SubCompaniesSection` stay in the zone (customer-specific), each with Storybook stories.
- No new ADR: ADR-0008 covers it.

## Test plan
- **Acceptance:** `docs/features/customer-groups.feature` (`@task:053`) and three `@task:053` scenarios in `partner-access.feature`. New steps: `{string} has a sub-company {string}` (optionally `with status {string}`), `the customers listed are {string}`, `I open the edit page of the customer {string}`, `I restore {string} from the Deleted page`, `I choose {string} in {string} by editing the page`, `the customer {string} has a sub-company {string}` (leak workspace), `the admin removes {string} from {string}`, and `I add the contact … / I add the note …` if those don't exist yet.
- **Unit:**
  - `organization-input.test.ts`: parent parsing, giving `undefined`, `null`, a field error or an id.
  - `group-customers.test.ts`.
  - `seed-plan.test.ts`: one demo customer with two sub-companies.
- **DB:** `customer-groups.db.test.ts`: each trigger refusal; `customer_name.parent_name` for admins and partners; a partner assigned to a parent doesn't see the sub-company's name.
- **Storybook:** `PartOfField` (no parent, a parent, no choices, locked because the company has sub-companies, error) and `SubCompaniesSection` (empty with and without the admin link, several companies).

## Decisions
- **The parent's name shown to partners:** a partner assigned only "Acme Retail" sees "Acme Ltd › Acme Retail", so the parent's name, though not its page or details. Approved by the owner on 2026-11-02.

## Progress log
- 2026-11-02 – Drafted with the feature file. The feature file is in review; the scenarios stay `@wip` until coding starts.
- 2026-11-02 – Feature file approved. Red: 13 of 15 scenarios failed for the missing UI; the two partner scenarios about a parent's assignment already held (kept as regression guards). The partner scenario now uses the existing step "the admin unassigns" (same behavior). Fixed one scenario in its own commit: it has to switch back to my workspace before choosing another workspace's company, as `customer-links.feature` does, or it doesn't test the cross-workspace case.
- 2026-11-02 – Green: migration 0026 (`parent_id`, `organization_parent_check` trigger, `customer_name.parent_name`/`label`), Part of field, sub-companies section, grouped list, labels in every picker and list, delete and restore order, demo seed. 15/15 scenarios, 51 DB tests and 267 dashboard unit tests pass; demo seed checked twice against a throwaway workspace (replace works).

## Parking lot
- Rolling up a parent's contacts across its sub-companies.
- A "sub-companies too" toggle on the customers list (the design mentions it; flat filtered rows cover it for now).
