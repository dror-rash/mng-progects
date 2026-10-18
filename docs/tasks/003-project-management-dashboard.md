# Task 003: Project Management Dashboard Zone

- **Status:** done
- **Milestone:** M2
- **Zone / package:** `apps/dashboard`, `packages/db`, `apps/shell`
- **Feature file:** `docs/features/project-dashboard.feature`

## Why
Users need a dedicated, authenticated dashboard to view their project overview, create projects, and track tasks with status workflows (Todo, In Progress, Done).

## Scope
- Add `project` and `task` tables to `packages/db/src/schema.ts`, run `pnpm db:generate` and `pnpm db:migrate`.
- Create `apps/dashboard` as a new multi-zone Next.js app (`:3002`, `basePath: "/dashboard"`).
- Configure shell proxy rewrites for `/dashboard` and `/dashboard/:path+` pointing to `DASHBOARD_URL` (default `http://localhost:3002`).
- Protect dashboard zone routes with `middleware.ts` (`redirectToLoginIfNoSession`).
- Implement Server Components and Actions to display user projects, stats (total projects, active tasks, completion rate), and project creation.
- Add dashboard acceptance scenarios in `docs/features/project-dashboard.feature`.
- Add webServer config to `e2e/playwright.config.ts`.

## Out of scope
- Real-time WebSockets / live cursor collaboration.
- Drag-and-drop kanban board reordering (standard status selector/actions used for initial release).

## Acceptance criteria
- [x] Unauthenticated visitor accessing `/dashboard` is redirected to `/login`.
- [x] Authenticated user sees the Project Management Dashboard with their projects and metrics.
- [x] Authenticated user can create a new project and see it listed immediately.
- [x] Navigation between shell landing page and dashboard zone works seamlessly.

## Approach (brief)
1. Write Gherkin acceptance scenarios in `docs/features/project-dashboard.feature`.
2. Add `project` and `task` tables to `packages/db/src/schema.ts`, generate migration via `pnpm db:generate`, and run `pnpm db:migrate`.
3. Create `apps/dashboard` with Next.js App Router, `@repo/auth`, `@repo/db`, and `@repo/ui`.
4. Configure shell rewrites in `apps/shell/next.config.ts` and env variables.
5. Add `apps/dashboard` to `e2e/playwright.config.ts`.
6. Implement server queries and UI for dashboard and project creation.
7. Run all acceptance and unit tests to verify green.

## Test plan
- Acceptance: `docs/features/project-dashboard.feature`
- Unit/component: Schema export & queries testing
- End-to-end multi-zone navigation testing

## Progress log
- 2026-10-18 – Task created and prioritized for Milestone M2.
- 2026-10-18 – Database migrations applied, apps/dashboard created, shell rewrites configured, 14 e2e acceptance scenarios passing.

## Parking lot
- Task assignment to team members / multiple contributors.
