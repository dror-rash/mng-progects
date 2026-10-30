# Task 033: Missing indexes

- **Status:** todo
- **Milestone:** M9
- **Zone / package:** `packages/db`
- **Feature file:** none (no behavior change)

## Why
Foreign keys used in joins and cascades have no index, so these lookups scan whole tables as data grows.

## Scope
- Indexes on `task.project_id`, `organization_note.author_id`, `workspace_invite.created_by`.

## Out of scope
- The `workspace_member.user_id` cascade on user deletion. There is no user-deletion flow yet, so it moves to M10 Accounts.

## Acceptance criteria
- [ ] One generated migration adds the three indexes; `pnpm db:migrate` applies it on a fresh and an existing database.
- [ ] The full e2e suite stays green.

## Approach (brief)
Edit `packages/db/src/schema.ts`, then run `pnpm db:generate`. **Migration order:** tasks 033, 038 and 041 each add a migration. Whoever merges later rebases, deletes their generated SQL and journal entry, and runs `pnpm db:generate` again. Never hand-edit a migration that is already applied.

## Test plan
- Manual: `EXPLAIN` a board query before and after, and paste it in the PR.

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.

## Parking lot
- `workspace_member.user_id` cascade can leave a shared workspace without an admin when a user is deleted. Handle it in the M10 user-deletion flow.
