# ADR-0008: Customer groups, sites, a worker role and field data

- **Status:** accepted
- **Date:** 2026-11-02
- **Design:** `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` (the owner's decisions and the rules behind them live there)
- **Amends:** ADR-0004 (organizations get one level of children) and ADR-0006 (a `worker` role; partners and workers see their projects' sites). Offline capture is ADR-0009.

## Context
Customers are often large organizations with sub-brands or sub-companies, each with its own contacts and information. Work happens at physical sites, and technicians record what they find there: visits, photos, readings on forms and reports. Some technicians are internal staff, who need less access than admins; others are partner users. Under ADR-0004 an organization is flat and a project has no location. Under ADR-0006 the only internal roles are admin and auditor, and partners see nothing of a customer but its name.

## Decision
- **Hierarchy:** `organization.parent_id`, one level deep, in the same workspace and of the same kind. A trigger and the code enforce it. A sub-company is a full organization (contacts, notes, tags, info). Projects and tasks link to either level. Partners are assigned to each organization separately: assigning a parent doesn't cover its sub-companies.
- **Sites** are their own table (`site`, `site_contact`), not organizations. A site belongs to an organization or a sub-company, and only admins create and change sites. `project.site_id` is required by the forms and nullable in the database, because existing projects have none. The site must belong to the project's organization or one of its sub-companies, which a trigger and the code check.
- **Worker role:** a new `worker` membership role for internal technicians, with no partner. Workers see only the projects whose crew they're on (`project_worker`, managed by admins). There they change tasks and record field data, but they can't change project settings or create projects. Customers are names only, as for partners.
- **Access:** the existing SQL functions and row-level security cover every new table.
  - `access_role` gains `worker`, and `can_see_project` includes crew membership.
  - The new `can_work_on_project` covers tasks and field data, and is separate from `can_change_project` (settings, cancel, copy, delete).
  - The new `can_see_site` lets partners and workers see the sites of projects they can see.
  - The new `site_choice` view gives partners the site names of their assigned customers, to pick from.
- **Field data:**
  - Tables: `site_visit` (+ `site_visit_member`), `attachment` (photo, file, uploaded report), `form_template` → `form_template_version` (immutable once published) → `form_field`, `form_submission` (`jsonb` values checked against the version in code), and `generated_report` (a PDF snapshot).
  - Every field record has a client-generated UUID, so writes are idempotent (needed by ADR-0009).
  - Visits, attachments, submissions and reports follow their project's access.
- **Files** live in a private object store behind `@repo/storage`: Google Cloud Storage in deployments, `fake-gcs-server` locally. Browsers upload and download through short-lived signed URLs, issued only after an access check. Postgres holds only metadata.

## Alternatives considered
- **Locations as sub-companies (no site table).** Fewer tables, but a site isn't a company: it has no tax ID, notes or customer status. Partner and worker access would then have to open up organization rows they mustn't see.
- **An unlimited organization tree.** More flexible, but every rollup, picker and access check would have to walk a recursive tree. The owner asked for one level.
- **Partner access to a parent covering its sub-companies.** Convenient, but it widens access silently whenever a sub-company is added. The owner chose per-organization assignment.
- **Internal technicians as admins, or as auditors.** Admins would see and change everything. Auditors can't record anything. A crew-scoped role grants only what's needed.
- **One row per reading value (EAV).** Easy to query across sites, but more work to write, show and check. `jsonb` with a versioned template is enough until readings are compared across sites (parking lot).
- **Files in Postgres (`bytea`) or uploaded through the app.** Simpler, but large photos would bloat the database and pass through Cloud Run's request limits.

## Consequences
- **Good:**
  - Customer groups and sites fit the existing directory and its components.
  - Every new table sits behind the same two locks (code predicates and row-level security).
  - Workers get least-privilege access.
  - Readings stay valid when a form changes.
  - Client ids make retried writes safe.
- **Bad / trade-offs:**
  - More access functions (crew, sites), each called per row by the policies; measure the largest lists with EXPLAIN.
  - Existing projects have no site until someone adds one, so the database can't enforce "required".
  - The real bucket, its Terraform and signed-URL credentials (Workload Identity) depend on M11.
  - `jsonb` readings need a parser and can't be compared across sites with plain SQL.
- **Follow-ups:**
  - ADR-0009 (offline capture).
  - An ADR for the PDF rendering approach (task 065).
  - Report contents, form field types and file limits are open questions in the design.
  - The leak suite grows with every new table and with signed URLs.
