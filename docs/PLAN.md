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
| M9 | Polish & Hardening | Every open parking-lot item: members-page errors, invite hygiene, workspace settings, header, cross-workspace reads, caching, indexes, test cleanup, SQL counts, dark mode, drag-and-drop, primary contact, chart tooltips (027–039); other organization kinds (040) and time zones (041, ADR-0006) once decided | in review (027–039); 040–041 blocked |

## Current milestone
M9 Polish & Hardening. Tasks 027–039 are in review together on `feat/m9-polish`; 040 and 041 wait for decisions. Tasks were split so they could run in parallel; each owns its files and feature-file scenarios (written `@wip` first, per WORKFLOW).

| Lane | Tasks | Can start | Shared files / order |
|---|---|---|---|
| Workspaces | 027 members page, 028 invite links, 029 settings, 032 lookups | now | 027 and 028 edit different functions in `workspaces/actions.ts`; 029 uses a new `settings-actions.ts` |
| Reads | 031 cross-workspace display, 035 SQL counts | now | both edit `tasks/queries.ts`: 031 the existing functions, 035 appends |
| UI | 030 header, 037 drag-and-drop, 039 tooltips | now | 030 and 037 both touch `projects/[projectId]/page.tsx` (props vs board) |
| UI | 036 dark mode | now (ui + shell); dashboard header after 030 | `AppHeader` |
| Data | 033 indexes, 038 primary contact | now | migrations: later merge rebases and re-runs `pnpm db:generate` |
| Hygiene | 034 test steps and comments | now | trivial comment overlap with 031 |
| Blocked | 040 organization kinds (product answers), 041 time zones (ADR-0006) | after decision | 041 adds a migration too |

Next candidates after M9: M10 accounts and email (incl. user deletion), M11 deploy to GCP.

## Risks & open questions
- CI `deploy` fails until GCP is set up (`infra/README.md`): no Workload Identity provider or project vars configured.
- Timestamps are stored without time zone schema-wide; safe while Postgres runs in UTC (see task 010 parking lot).
- Multi-zone rewrites configuration for new `/dashboard` zone in Next.js shell and Cloud Run deployment.

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
