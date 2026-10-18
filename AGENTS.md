# Agent Rules

Read this file first, every session. `AGENTS.md` is a copy/symlink of this file for non-Claude agents.

## Read order
1. `docs/PLAN.md` – what we are building and current milestone
2. `docs/ARCHITECTURE.md` – zone map, package boundaries, conventions
3. `docs/WORKFLOW.md` – the loop you must follow
4. The active task in `docs/tasks/` and its linked `.feature` file

If the plan, feature file, or task is missing or unclear: **stop and ask**. Do not invent scope.

## Stack
Next.js (App Router, multi-zone) · Better Auth · Postgres + Drizzle · TypeScript strict · Tailwind + shadcn/ui · Storybook · Vitest + Testing Library (unit/component) · Playwright + Gherkin via playwright-bdd (acceptance) · Turborepo + pnpm · GCP (Cloud Run, Artifact Registry, Secret Manager, Terraform) · GitHub Actions

## Commands
- `pnpm db:up` – local Postgres (Docker); `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio`
- `pnpm dev` – run all zones (shell :3000, example-zone :3001); needs `.env` (copy `.env.example`) and the database up
- `pnpm test` – unit/component tests (Vitest)
- `pnpm test:e2e` – acceptance tests (Gherkin via Playwright; generates specs with `bddgen`, then runs)
- `pnpm storybook` – UI workbench on :6006
- `pnpm lint && pnpm typecheck` – must pass before any commit
- `pnpm build` – build everything (Turborepo caches; CI can add `--filter=...[origin/main]`)
- Single package: `pnpm --filter @repo/ui test`, `pnpm --filter @repo/shell dev`

## Non-negotiable rules
1. **No production code without a failing test first.** Acceptance test (ATDD) for behavior, unit test (TDD) for logic. Show the red run before writing the implementation.
2. **Feature files are the source of truth.** Behavior lives in `docs/features/*.feature`. Never edit a scenario to make a test pass; if behavior must change, update the feature file in its own commit and say why.
3. **Plan before code.** Work happens against a task file in `docs/tasks/`. One task = one small, reviewable change.
4. **Respect boundaries.** Zones never import from each other; share code only through `packages/*`. Cross-zone navigation uses plain links/rewrites, not imports.
5. **UI goes through `packages/ui`.** Use shadcn primitives. Every new component ships with a Storybook story covering its states.
6. **Server Components by default.** Add `"use client"` only for interactivity, and keep client islands small.
7. **No secrets in the repo.** Config via env vars; production secrets in Secret Manager. Auth to GCP uses Workload Identity Federation.
8. **Don't expand scope.** Out-of-scope ideas go in the task's "Parking lot", not the diff.
9. **Record decisions.** Any choice that is hard to reverse gets an ADR in `docs/adr/`.
10. **Infra is code, deploys go through CI.** Change GCP only via `infra/` Terraform (show `terraform plan` output in the PR). Never commit state, `*.tfvars`, or credentials; never deploy by hand to production.
11. **Auth goes through `@repo/auth`.** Never read or parse session cookies yourself. Middleware is only an optimistic check; every protected page/route handler must call `getSession()`. Post-login redirects must use `safeNext`.
12. **Data goes through `@repo/db`.** Schema changes = edit `packages/db/src/schema.ts`, run `pnpm db:generate`, commit the SQL migration. Never edit applied migrations; never change the database by hand.
13. **No secrets or real user data in tests, fixtures, logs, or commits.** E2E creates unique throwaway accounts per scenario.

## Testing conventions
- Test behavior and outputs, not implementation details. Query by role/label, not test IDs, unless unavoidable.
- Do not mock our own modules in acceptance tests. Mock only external boundaries (third-party APIs, time, network).
- Test names read as sentences: `it("shows an error when the email is invalid")`.
- Flaky tests are bugs: fix or delete, never retry-and-ignore.

## Commits & PRs
- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), scope = zone or package (`feat(shell): ...`).
- Prefer the sequence: `test:` (red) → `feat:` (green) → `refactor:`.
- PR description links the task file and feature file, and lists the Definition of Done checks.

## When finished with a task
Run the Definition of Done in `docs/WORKFLOW.md`, update the task's status and the plan's milestone, then summarize: what changed, what was tested, open questions.
