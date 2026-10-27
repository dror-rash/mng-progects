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
- Shared auth/session via cookie on the root domain; the contract is documented in ADR-0002 (create when needed).

## Packages
| Package | Purpose |
|---|---|
| `packages/ui` | shadcn components, design tokens, Storybook |
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
- ADR-0005 – Workspaces, roles, and invite links (proposed)

## Adding a zone
1. Copy `apps/example-zone` to `apps/<name>`; rename the package to `@repo/<name>`, pick a free port, set `basePath: "/<name>"`.
2. In `apps/shell/next.config.ts`, add a rewrite pair (`/<name>` and `/<name>/:path+`) to an env-configured URL.
3. Add the env var to `.env.example` and to the Playwright `webServer` list.
4. Add a row to the zone map above and a feature file for its first behavior.
