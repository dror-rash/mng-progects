# Plan

> Fill this in at the start of each project. Keep it short and current. Agents read this first.

## Goal
Build a modern, full-stack Project Management application on a Next.js multi-zone architecture with authentication, polished landing and login pages, and an authenticated project management dashboard with database persistence.

## Non-goals
- Third-party OAuth integrations (keep email/password for initial milestone)
- Real-time WebSockets/collaborative editing (keep standard server queries & actions for now)

## Users & key journeys
1. Visitor explores the product on the landing page and signs up / logs in.
2. Authenticated user navigates to the project management dashboard.
3. Project manager views and manages projects and tasks.
4. User opens a project, adds tasks, and moves them from To do → In progress → Done.
5. User keeps a list of customers (details, contact people, notes) and sees every project and open task for a customer.

## Milestones
| # | Milestone | Outcome | Status |
|---|---|---|---|
| M0 | Foundation | Monorepo, CI, deploy pipeline green with hello-world | done |
| M1 | Shell Polish | Modern landing page and upgraded login experience in `apps/shell` | done |
| M2 | Project Management Dashboard | Dedicated `apps/dashboard` zone at `/dashboard` with DB persistence (projects & tasks) | done |
| M3 | Template Scaffolding Script | Interactive bash script to scaffold a new project from the template | done |
| M4 | Core Project Management | Open a project, manage its tasks on a To do / In progress / Done board, real overview stats, edit/delete projects (tasks 005–008) | done |
| M5 | Home Metrics | `/dashboard` becomes a metrics home (totals, tasks by status, recently started projects with progress, activity this week); full list + create form move to `/dashboard/projects` (tasks 009–010) | done |
| M6 | Customers | Task page (011) and inline form errors (012); a customers directory with details, contact people, dated notes, and tags (013–015); projects and tasks link to a customer, and each customer shows its projects and open tasks (016–017). ADR-0004 | done |
| M7 | Task Details | Task priority (018) and due dates with overdue / due-this-week on the home page (019) | done |
| M8 | Workspaces & Sharing | Workspaces own projects, tasks and customers; Admin/Member roles; invite links; workspace switcher; task assignees and "My tasks" (ADR-0005) | done |
| M9 | Polish & Hardening | Open parking-lot items: members-page errors, invite hygiene, workspace settings, header, cross-workspace reads, request caching, indexes, test cleanup, SQL counts, dark mode, drag-and-drop, primary contact, chart tooltips (tasks 027–039) | done |
| M12 | Partner Access | Admin / Auditor / Partner roles; partner companies with assigned customers; partners see only their own projects and customer names; enforced by SQL access functions and row-level security; project cancel/copy; soft delete everywhere (ADR-0006, tasks 046–052, plan `docs/superpowers/plans/2026-10-31-partner-access.md`) | done |
| M13 | Sites & Field Data | Customers get sub-companies (one level); physical sites with on-site contacts; every project has a site; a Worker role for internal technicians; site visits, photos and files, admin-built reading forms, uploaded and generated reports; offline capture with sync and no data loss; partners and workers see their projects' sites (amends ADR-0004 and ADR-0006; ADR-0008, ADR-0009 offline; design `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md`, proposed tasks 053–065) | in progress |
| POC | POC, deployed (2026-11-13) | One flow from customer to report on the public `run.app` URL: agent team (067), first GCP deploy (068, M11), M13 tasks 056–061 and 064, end-to-end `@poc` scenario and demo data (069). Out: offline capture (062–063), generated PDF (065), custom domain. ADR-0010 | in progress |

## Current milestone
**POC, due 2026-11-13** (owner, 2026-11-02): deployed on GCP, demo data only, no custom domain. Order:
1. Task 067 agent team (ADR-0010): agents, hooks, lanes.
2. In parallel lanes:
   - 068 first GCP deploy (M11);
   - M13 056 worker role → 058 site visits → 059 photos;
   - 057 storage → 060 form templates → 061 readings → 064 uploaded reports.
3. 069: the `@poc` flow against the deployed preview.

M13 tasks 062, 063 and 065 continue after the POC.

## Risks & open questions
- Invite tokens will appear in Cloud Run / load balancer request logs until a log exclusion is added in `infra/` (task 028 parking lot; do it with M11).
- CI `deploy` fails until GCP is set up (`infra/README.md`): no Workload Identity provider or project vars configured.
- Timestamps are stored without time zone schema-wide; safe while Postgres runs in UTC (see task 010 parking lot).
- Multi-zone rewrites configuration for new `/dashboard` zone in Next.js shell and Cloud Run deployment.
- Before the first production deploy (M11): runtime and migrations share one Cloud SQL login that owns the tables, and RLS isn't forced (ADR-0006), so the `-c role=app_user` startup option is what applies the policies; the pool refuses a connection that isn't `app_user` (task 052), but this is untested on Cloud SQL. After `db:migrate` on staging, `select current_user, pg_has_role('app_user', 'MEMBER')` on a runtime connection must show `app_user` and `true`, and migration 0025's `REVOKE TEMPORARY … FROM PUBLIC` must have applied (the login must own the database or be a member of its owner).
- Row-level security calls an access function per row (`can_see_project` and friends, ADR-0006): fine at today's sizes, but large lists may need the policies or the functions tuned (measure before M11 load).
- Deletes are soft, but nothing records who changed what else: an audit log is a follow-up (and purging deleted items after a retention period, design Parking lot).

## Change log
- 2026-10-18 – Updated plan for Project Management app: M1 Landing & Login polish, M2 Dashboard zone.
- 2026-10-22 – Added M4 Core Project Management: project page with task board (005), real stats (006), edit/delete projects (007). Keep it simple; new capabilities go in `features/<name>/` folders in the dashboard zone.
- 2026-10-22 – Added M5 Home Metrics at the user's request: home page dedicated to metrics and recently started projects (5), with an All projects page.
- 2026-10-22 – M4 and M5 merged. CI `verify` no longer runs the e2e package via `pnpm test` (it needs a build first); acceptance tests run in the `e2e` job.
- 2026-10-23 – Planned M6 Customers at the user's request (011–017, ADR-0004: one typed organizations directory, customers first; projects and tasks link to it). Task priority and due dates move to M7 (018–019). Sharing proposed as M8. Unimplemented specs are tagged `@wip`.
- 2026-10-26 – M6 Customers merged (PR #4, incl. review fixes in task 020). Starting M7.
- 2026-10-26 – M7 Task Details merged (PR #6, incl. review fixes in task 021). Next: M8 authorization ADR.
- 2026-10-26 – ADR-0005 proposed: workspaces own all data, Admin/Member roles, invite links, one assignee per task (user decisions).
- 2026-10-26 – M8 reviewed: a removed member could be re-added as admin, two admins could remove each other at once, and actions trusted the cookie's workspace. Fixed in task 026 with migration 0015 (creator column cleared, not cascaded, on user delete).
- 2026-10-27 – M8 Workspaces & Sharing merged (PR #9, tasks 022–026; ADR-0005 in PR #8). Validated on `main`: 102/102 e2e, 159 unit, build; screenshots of every page and form via `pnpm --filter @repo/e2e screenshots`.
- 2026-10-30 – Planned M9 Polish & Hardening from every open parking lot (tasks 027–041), split into parallel lanes. Not drafted: moving the board to `packages/ui` (no second zone needs it), structured addresses (no invoices). The user-deletion cascade moves to M10.
- 2026-10-30 – Tasks 027–039 ran in parallel (one agent and worktree each, own database and ports) and were merged into `feat/m9-polish`. Task 038's migration was regenerated as `0017` after task 033's `0016`. Task 036's dashboard header toggle was added after task 030 merged. Validated on the combined branch: 146/146 e2e on a quiet machine (the multi-person timeouts seen during parallel runs were load), 223 unit, lint, typecheck, 18 migrations on a fresh database.
- 2026-10-30 – M9 Polish & Hardening merged (PR #12, tasks 027–039). CI on `main` then failed at `pnpm build-storybook` on Node 22 (`import.meta.dirname` in the Storybook config); fixed in PR #13. Tasks 040 and 041 move out of M9, still blocked on decisions.
- 2026-10-31 – Outside a milestone, at the user's request: projects get their own create page (task 042, PR #15) and All projects becomes a filterable table with a Tiles toggle (task 043, PR #16). Demo seed for local dev (PR #17).
- 2026-10-31 – "New project" on a customer's page, with that customer chosen (task 044, PR #19).
- 2026-10-31 – The projects table sorts by any column, kept in the URL with the filters (task 045, PR #20).
- 2026-10-31 – ADR-0006 accepted at the user's request: admins, auditors and partner companies; access defined once as SQL functions, enforced in code and by row-level security. Planned as M12 (tasks 046–051). Time zones move to ADR-0007. Design, ADR and plan in PR #21.
- 2026-10-31 – Task 046: Admin / Auditor / Partner roles, partner tables, project owners and the six SQL access functions (migration 0018); every query and action goes through `features/access/`; existing members became admins and open invite links were revoked (PR #22).
- 2026-10-31 – Task 047: row-level security as the second lock. The runtime pool runs as `app_user`, every query runs inside `withAccess` (outside it the database returns nothing), and creating or joining a workspace goes through definer functions; seeds, tests and fixtures use `@repo/db/maintenance` (migrations 0020–0021, PR #23).
- 2026-10-31 – Task 048: partner companies on `/partners` (admins create them and assign customers; auditors see them), "Partner: <name>" invite links and role changes, which clear assignments the person can no longer see (migration 0022); opening a link when already a member changes nothing (PR #24).
- 2026-10-31 – Task 049: the partner experience. Customer names come from the `customer_name` view everywhere (customers only, not deleted: migration 0023), as text for partners; partners create their own partner's projects and admins choose the owner; assignees are the partner's users and admins (never auditors). The `@task:049` leak suite (`partner-access.feature`) checks every page and form for another partner's data; later tasks extend it (PR #25).
- 2026-11-01 – Task 050: cancel a project (a hand-set lifecycle shown as "Canceled") or copy it to a new owner (PR #26).
- 2026-11-01 – Task 051: every delete is soft (projects, tasks, customers, contacts, notes, partners); admins restore from the Deleted page, auditors see it, partners never do. Migration 0024: `delete_task` and `restore_project` (what the policies can't allow), and a deleted partner's invite links stop working. A deleted partner's users land in a personal workspace (PR #27).
- 2026-11-01 – Task 052: hardening after the M12 final review. Definer functions pin `search_path = public, pg_temp` and `TEMPORARY` is revoked from `PUBLIC` (migration 0025); the runtime pool refuses a connection that isn't `app_user`; demoting someone to auditor clears their assignments; deleted partners' users aren't assignable; saving a task keeps an assignee who isn't one of the choices (PR #28). M12 Partner Access done.
- 2026-11-02 – Planned M13 Sites & Field Data at the owner's request: customers have sub-companies, projects happen at sites, and technicians (a new Worker role, and partner users) record visits, photos, readings and reports, offline too, syncing without data loss. Sites are admin-only and required on projects. Design draft with the owner's answers; ADR-0008 and ADR-0009 (offline) follow approval. Open: report contents, form field types, file limits.
- 2026-11-02 – ADR-0008 (customer groups, sites, worker role, field data, file storage) and ADR-0009 (offline capture: PWA, IndexedDB outbox, idempotent sync) accepted; they amend ADR-0004 and ADR-0006.
- 2026-11-02 – Task 053: customer groups. Customers get one level of sub-companies (migration 0026: `parent_id`, a one-level trigger, parent names in `customer_name`), shown as "Parent › Sub-company" everywhere; partners stay assigned per company.
- 2026-11-02 – Task 053 done (PR #32). Task 066 drafted: `task-assignees.feature` scenarios fail at random under local parallel load, on `main` too (CI passes).
- 2026-11-02 – Task 054: sites with on-site contacts (migration 0027: `site`, `site_contact`, `can_see_site`, `can_change_site`); admins change them, auditors read them, partners see none until task 055.
- 2026-11-02 – Task 055: every new or edited project needs a customer and one of its sites (owner's call: "customer and site always"); older projects show "No site yet." until edited. Migration 0028 (`project.site_id`, `project_site_check`, `site_choice`); partners see the sites and on-site contacts of their projects; a site in use can't be deleted, and a sub-company can't leave a parent whose projects use its sites.
- 2026-11-02 – Planned the POC for 2026-11-13 at the owner's request: GCP (not AWS; similar cost and the Terraform exists), no custom domain, demo data only, offline capture and the generated report left out. Agent team first (task 067, ADR-0010), then tasks 068 (first deploy) and 069 (end-to-end flow).
- 2026-11-02 – Task 056: a Worker role for internal technicians and project crews (migrations 0029–0030): workers see and work on their crews' projects (tasks: add, edit, move, assign; no delete), with sites and customer names; admins manage crews from the project page; leaving a crew clears the worker's tasks there.
- 2026-11-02 – Task 057: `@repo/storage` (signed upload and download URLs, `stat`, `remove`, `objectKey`) on Google Cloud Storage, `fake-gcs-server` locally and in CI. The real bucket comes with task 068.
- 2026-11-02 – Task 058: site visits (migrations 0031–0032): record a visit with who was there and notes, edit, delete and restore; client ids make a resent form record one visit; only the author and admins change a visit.
- 2026-11-02 – Task 059: photos and files on a project or visit (migrations 0033–0034): uploads go straight to storage through signed URLs and are checked after; `/attachments/<id>` opens them for whoever may see them; the uploader and admins delete, admins restore.
