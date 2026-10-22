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

## Milestones
| # | Milestone | Outcome | Status |
|---|---|---|---|
| M0 | Foundation | Monorepo, CI, deploy pipeline green with hello-world | done |
| M1 | Shell Polish | Modern landing page and upgraded login experience in `apps/shell` | done |
| M2 | Project Management Dashboard | Dedicated `apps/dashboard` zone at `/dashboard` with DB persistence (projects & tasks) | done |
| M3 | Template Scaffolding Script | Interactive bash script to scaffold a new project from the template | done |
| M4 | Core Project Management | Open a project, manage its tasks on a To do / In progress / Done board, real overview stats, edit/delete projects (tasks 005–008) | in-review |
| M5 | Home Metrics | `/dashboard` becomes a metrics home (totals, tasks by status, recently started projects with progress, activity this week); full list + create form move to `/dashboard/projects` (tasks 009–010) | in-review |

## Current milestone
**M5** – Home Metrics. Tasks 009–010 implemented on `feat/m5-home-metrics`, awaiting review. (M4 in review: PR #1.)

## Risks & open questions
- Multi-zone rewrites configuration for new `/dashboard` zone in Next.js shell and Cloud Run deployment.

## Change log
- 2026-10-18 – Updated plan for Project Management app: M1 Landing & Login polish, M2 Dashboard zone.
- 2026-10-22 – Added M4 Core Project Management: project page with task board (005), real stats (006), edit/delete projects (007). Keep it simple; new capabilities go in `features/<name>/` folders in the dashboard zone.
- 2026-10-22 – Added M5 Home Metrics at the user's request: home page dedicated to metrics and recently started projects (5), with an All projects page.
