# Waypoint

Full-stack web app template: Next.js multi-zone, shadcn/ui, Storybook, Playwright (ATDD), Vitest (TDD), GCP, GitHub Actions.

## Start here
- Humans: `docs/PLAN.md` → `docs/WORKFLOW.md`
- Agents: `CLAUDE.md`

## Using the template
- **Scaffold a new project automatically:**
  ```bash
  pnpm scaffold    # interactive setup: sets project name, generates secrets, copies clean files
  # or non-interactively:
  ./scripts/create-project.sh --name "my-app" --dest "../my-app"
  ```
- **Manual setup:**
  1. Fill in `docs/PLAN.md` (goal, non-goals, milestones).
  2. Create the first task from `docs/templates/task.md`.
  3. Write its feature file, then follow the loop in `docs/WORKFLOW.md`.

## Quick start
```bash
nvm use            # Node 22
pnpm install       # generates pnpm-lock.yaml (commit it; CI uses --frozen-lockfile)
cp .env.example .env   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:up         # local Postgres in Docker
pnpm db:generate   # FIRST TIME ONLY: creates the initial SQL migration; commit packages/db/migrations
pnpm db:migrate
pnpm dev           # shell :3000, example zone :3001, dashboard :3002
pnpm test          # unit/component
pnpm exec playwright install chromium --with-deps   # once
pnpm test:e2e      # acceptance (Gherkin)
pnpm storybook     # UI workbench :6006
```

## Layout
`apps/shell` (root zone) · `apps/example-zone` · `apps/dashboard` · `packages/ui` (shadcn + Storybook) · `packages/config` · `packages/testing` · `packages/db` (Drizzle + Postgres) · `packages/auth` (Better Auth) · `scripts/` · `e2e` (Playwright-BDD) · `docs/` (plan, workflow, features, ADRs)

Feature/ADR/task templates live in `docs/templates/`.
