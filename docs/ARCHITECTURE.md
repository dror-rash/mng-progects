# Architecture

## Overview
Turborepo monorepo (pnpm). Each **zone** is an independently deployable Next.js app. A **shell** zone owns the root domain and routes paths to other zones via `rewrites`.

## Zone map
| Zone | App | Owns paths | Deploys to |
|---|---|---|---|
| shell | `apps/shell` (`@repo/shell`, :3000) | `/`, `/login`, `/signup`, `/api/auth/*`, anything unclaimed | Cloud Run `shell` |
| example | `apps/example-zone` (`@repo/example-zone`, :3001) | `/example/*` | Cloud Run `example-zone` |
| dashboard | `apps/dashboard` (`@repo/dashboard`, :3002) | `/dashboard/*` | Cloud Run `dashboard` |

Rules:
- Non-root zones set `basePath` (e.g. `/example`). Pages and assets then live under one prefix, so assets never collide and the shell needs only one rewrite pair per zone.
- Zones never import each other. Shared code lives in `packages/*`.
- Navigating between zones is a hard navigation (`<a>`), not `next/link`.
- Shared auth/session via cookie on the root domain; the contract is documented in ADR-0003.

## Packages
| Package | Purpose |
|---|---|
| `packages/ui` | shadcn components, design tokens, Storybook (which also loads `apps/dashboard/features/**/*.stories.tsx`) |
| `packages/config` | tsconfig, eslint, tailwind presets |
| `packages/testing` | Test data builders |
| `packages/db` | Drizzle schema, migrations, lazy Postgres client |
| `packages/auth` | Better Auth server/client, zone middleware helper, `SignOutButton` |

## Conventions
- Feature-based folders at each zone's root: `features/<feature>/` (imported as `@/features/...`).
- Server Components by default; data fetching in server code, not in client effects.
- Env vars validated at startup with a schema; never read `process.env` ad hoc.

## Authentication & users
- Better Auth (email + password) in `packages/auth`; users, sessions and accounts in Postgres via Drizzle (`packages/db`).
- The **shell owns** the auth pages and `/api/auth/*`. All zones share one origin, so one session cookie works everywhere.
- Every zone validates sessions itself with `getSession()` (same DB, same `BETTER_AUTH_SECRET`).
- Protecting a page in a zone: add `middleware.ts` using `redirectToLoginIfNoSession` for the fast path, **and** call `getSession()` in the page. See `apps/example-zone` (`/example/account`).
- Cross-zone redirects use relative `Location`/`window.location.assign`, never `next/link`, and `next` targets pass through `safeNext`.
- Cookie settings (`useSecureCookies`) must match in all zones.
- Better Auth rate-limits sign-up/sign-in in production builds. Only the Playwright test servers set `AUTH_DISABLE_RATE_LIMIT=true` (in `e2e/playwright.config.ts`); never set it in a deployed environment.
- Schema changes: edit `packages/db/src/schema.ts` → `pnpm db:generate` → commit the migration. CI/CD applies migrations before deploy.

## Authorization (ADR-0005, ADR-0006)
- Workspaces own projects and customers; tasks, contacts and notes inherit through their parent. Each membership (`workspace_member`) has a role: `admin` (everything), `auditor` (sees everything, changes nothing) or `partner` (with `partner_id`: only their partner's projects for customers assigned to it, and those customers' names).
- Who can see and change what is defined once, as SQL functions in the database (migration 0018): `access_role`, `can_see_project`, `can_change_project`, `can_see_customer`, `can_see_customer_name`, `can_change_customer`. Code reaches them only through `apps/dashboard/features/access/`: `predicates.ts` (SQL conditions for queries), `require-change.ts` (server checks for writes), `scope.ts` (`canChange(role)` to hide forms).
- Pages: `requireWorkspace(path)` gives the session and the current workspace with my `role` and `partnerId` (cookie, checked against membership; first use creates a personal workspace). Lists take the user id and filter with the predicates and `deleted_at is null`. Record lookups (`get…ForUser`) filter with `canSee…` and return `canChange` for that record, so links work from any of the user's workspaces and show the controls the role there allows. A record someone can't change has no edit or delete page for them: they get its not-found page.
- Actions: `requireWorkspaceForAction(formData)` uses the form's posted `workspaceId`, never the cookie. Project and task writes call `requireProjectChange`, customer, contact and note writes `requireCustomerChange`, and members, invites and settings check `isAdmin`; refusals look like a missing record. Membership changes lock the workspace row so a workspace always keeps an admin. Admins manage partner companies and their customers on `/partners` (auditors see them); invite links and the members page offer Admin, Auditor or "Partner: <name>" (value `partner:<id>`, `parseRoleChoice`). Changing a role or partner clears the person's assignments on tasks they can no longer see, and all of them when they become an auditor (`clear_unseen_assignments`); leaving or removal clears all of them (`clear_assignments`). Opening any link when you are already a member changes nothing. A project's owner is set when it is created and never changes: a partner's users create their own partner's projects, admins choose Internal or a partner (`project-owner.ts`); a partner's project always has one of the partner's customers, and so do its tasks (checked on every write). To hand work to another owner, a project is copied (`/projects/<id>/copy`, `copyProject` in `features/projects/copy.ts`: one `withAccess` transaction as the signed-in user; partners only into their own partner; tasks without assignees, a task's customer only if the new owner may see it; `copied_from_id` shown as a link only to those who can see the source) and the original canceled. Cancel / Reopen sets `project.status` (Drizzle `lifecycle`, `project-lifecycle.ts`) for anyone who can change the project; a canceled project shows "Canceled" in place of its task-derived status (`projectStatus(counts, lifecycle)`) and stays editable. Assignees are the project's partner's users and admins, or admins only on an internal project, never auditors or a deleted partner's users (`listAssigneeOptions` / `isAssignable`). The edit-task form doesn't post an assignee who isn't one of the choices (`assigneeHidden`, like `customerHidden`), so saving keeps them. `docs/features/partner-access.feature` (`@task:049`) is the leak suite: add a scenario there for every new page or form.
- Row-level security is the second lock (migration 0020): `project`, `task`, `organization`, `organization_contact`, `organization_note`, `partner`, `customer_partner`, `workspace_member`, `workspace_invite` and `workspace` have policies calling the same functions for `current_setting('app.user_id')`. The runtime pool connects with `-c role=app_user` (a `NOLOGIN` role that owns nothing); every query runs inside `withAccess(userId, fn)` from `@repo/db`, one short transaction that sets `app.user_id`, where `getDb()` returns that transaction. Outside it the pool sees nothing. Nested calls for the same user reuse the transaction. Actions read the session first, do their reads and writes in one `withAccess`, and call `redirect()` after it (it throws, which would roll back). RLS is enabled, not forced: the owner (migrations, `@repo/db/maintenance`, and the `SECURITY DEFINER` functions) bypasses it. So the role switch is the lock, and the runtime pool checks it: `onConnect` asserts `current_user = 'app_user'` on every new connection and the connection is closed and the query fails otherwise (`assertRole` in `pool-config.ts`; the maintenance pool isn't checked). Every `SECURITY DEFINER` function says `SET search_path = public, pg_temp` (pg_temp last, so a temp table can't shadow a real one inside it), and `TEMPORARY` on the database is revoked from `PUBLIC` (migration 0025); `hardening.db.test.ts` checks both, that every table but Better Auth's has RLS, and that no definer function is executable by `PUBLIC`. Partners read customer names only through the `customer_name` view (customers only, not deleted); the app reads every customer name and customer choice there (`features/organizations/customer-names.ts`), so names work the same for every role, as plain text for partners (no customer pages, no Customers link). Creating and joining a workspace go through `create_workspace` and `join_workspace`, reading an invite through `find_invite`. Better Auth uses `getPoolDb()` (its tables have grants, no RLS). Seeds, e2e fixtures and DB tests (`pnpm --filter @repo/db test:db`) use `getMaintenanceDb()`; a lint rule keeps it out of app code. New tables get `app_user` grants by default; give them policies, and revoke writes on new views.
- Every delete is soft (design rule 8, task 051) except a whole workspace (hard, ADR-0005 amendment) and revoking an invite link: delete actions set `deleted_at` / `deleted_by` on projects, tasks, customers, contacts, notes and partners. Every list and record lookup filters `deleted_at is null`, so a deleted record is "not found" like a made-up id. A deleted project hides its tasks; a deleted customer hides its contacts and notes, and its projects from partners (`partner_serves_customer`); a deleted partner ends its users' access (`access_role`; they get a personal workspace) and its invite links (`find_invite` says `partner_deleted`, `join_workspace` refuses them). Two writes the policies can't allow are `SECURITY DEFINER` functions with the same checks (migration 0024): `delete_task` (a partner may not update a task into one it can't see) and `restore_project` (nobody changes a deleted project). A partner's soft delete of a project stays a plain update: its new row passes `project_select` only because `can_see_project` (`STABLE SECURITY DEFINER`) reads the statement's snapshot, where the row isn't deleted yet; a policy change that makes that check see the new row would silently refuse it (`soft-delete.db.test.ts` covers it). The Deleted page (`/deleted`, `features/deleted/`) lists the workspace's deleted items for admins and auditors (`listDeleted`), not found for partners; admins restore there (`restoreAction`), parents first ("Restore its project first", "Restore its customer first").
- Invite links store only a SHA-256 hash of the token, expire after 7 days and can be revoked. Opening `/dashboard/invite/<token>` moves the token into a short-lived httpOnly cookie scoped to `/dashboard/invite` and redirects to `/dashboard/invite`, so the token never reaches a login `next=`, the address bar, a `Referer` (`Referrer-Policy: no-referrer`) or the request log. Joining reads the cookie and clears it.

## Environments
`local` → `preview` (per PR) → `staging` → `production`. Playwright runs against `preview`.

## Infrastructure (GCP)
Cloud Run per zone (own runtime service account) · Cloud SQL Postgres · Artifact Registry · Secret Manager · Terraform in `infra/` (state in GCS) · GitHub → GCP auth via Workload Identity Federation (no keys). Setup steps: `infra/README.md`.

## Deployment
- One `Dockerfile` for all zones (`--build-arg APP=<zone>`), using `turbo prune` and Next.js standalone output.
- `deploy.yml`: build/push `example-zone` → deploy → resolve its URL → build/push `shell` with `EXAMPLE_ZONE_URL` → deploy.
- PRs get tagged no-traffic revisions (`pr-<N>`); Playwright runs against the preview shell URL. `main` deploys with traffic.
- Rewrites are baked in at build time, so any change to a zone's URL requires rebuilding the shell.

## Decisions
See `docs/adr/`. Index:
- ADR-0001 – Monorepo with multi-zone Next.js
- ADR-0002 – Cloud Run, Workload Identity Federation, per-PR previews
- ADR-0003 – Better Auth with Postgres (Drizzle) as the user store
- ADR-0004 – One typed directory for customers and other external organizations
- ADR-0005 – Workspaces, roles, and invite links
- ADR-0006 – Partner access: admins, auditors and partner companies; SQL access functions, `withAccess` and row-level security

## Adding a zone
1. Copy `apps/example-zone` to `apps/<name>`; rename the package to `@repo/<name>`, pick a free port, set `basePath: "/<name>"`.
2. In `apps/shell/next.config.ts`, add a rewrite pair (`/<name>` and `/<name>/:path+`) to an env-configured URL.
3. Add the env var to `.env.example` and to the Playwright `webServer` list.
4. Add a row to the zone map above and a feature file for its first behavior.
