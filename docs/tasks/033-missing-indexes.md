# Task 033: Missing indexes

- **Status:** in-review
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
- [x] One generated migration adds the three indexes; `pnpm db:migrate` applies it on a fresh and an existing database.
- [x] The full e2e suite stays green. (Three load-related timeouts in the full run; they passed on rerun, see the progress log.)

## Approach (brief)
Edit `packages/db/src/schema.ts`, then run `pnpm db:generate`. **Migration order:** tasks 033, 038 and 041 each add a migration. Whoever merges later rebases, deletes their generated SQL and journal entry, and runs `pnpm db:generate` again. Never hand-edit a migration that is already applied.

## Test plan
- Manual: `EXPLAIN` a board query before and after, and paste it in the PR.

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.
- 2026-10-30 – Started. No behavior change, so no new scenarios and no red test: the sequence is `docs:` (in-progress) → `feat(db):` (schema + generated migration) → `docs:` (in-review).
- 2026-10-30 – Added `task_project_idx`, `organization_note_author_idx` and `workspace_invite_created_by_idx` in `schema.ts`; `pnpm db:generate` wrote `0016_cold_maria_hill.sql` (three `CREATE INDEX`, nothing else). `pnpm db:migrate` applied it on an existing database (`app_t033`) and on a fresh one created for the check (all 16 migrations, then dropped).
- 2026-10-30 – `EXPLAIN` before/after on `app_t033`. The tables hold only a few rows, so Postgres would seq-scan either way; both runs use `SET enable_seqscan = off` to show the index is usable, not that the planner prefers it at this size.

  Before:
  ```
  EXPLAIN SELECT * FROM task WHERE project_id = 'p1' ORDER BY created_at;
   Sort  (cost=10000000013.26..10000000013.26 rows=1 width=284)
     Sort Key: created_at
     ->  Seq Scan on task  (cost=10000000000.00..10000000013.25 rows=1 width=284)
           Filter: (project_id = 'p1'::text)
  EXPLAIN SELECT * FROM organization_note WHERE author_id = 'u1';
   Seq Scan on organization_note  (cost=10000000000.00..10000000016.12 rows=2 width=136)
  EXPLAIN SELECT * FROM workspace_invite WHERE created_by = 'u1';
   Seq Scan on workspace_invite  (cost=10000000000.00..10000000015.62 rows=2 width=152)
  ```
  After:
  ```
  EXPLAIN SELECT * FROM task WHERE project_id = 'p1' ORDER BY created_at;
   Sort  (cost=8.18..8.18 rows=1 width=284)
     Sort Key: created_at
     ->  Index Scan using task_project_idx on task  (cost=0.15..8.17 rows=1 width=284)
           Index Cond: (project_id = 'p1'::text)
  EXPLAIN SELECT * FROM organization_note WHERE author_id = 'u1';
   Bitmap Heap Scan on organization_note  (cost=4.16..9.50 rows=2 width=136)
     ->  Bitmap Index Scan on organization_note_author_idx  (cost=0.00..4.16 rows=2 width=0)
  EXPLAIN SELECT * FROM workspace_invite WHERE created_by = 'u1';
   Bitmap Heap Scan on workspace_invite  (cost=4.16..9.50 rows=2 width=152)
     ->  Bitmap Index Scan on workspace_invite_created_by_idx  (cost=0.00..4.16 rows=2 width=0)
  ```
- 2026-10-30 – Checks: `pnpm lint`, `pnpm typecheck` clean; `pnpm test` 159/159 (dashboard 119, ui 22, auth 13, db 5). Full e2e: 99/102; the 3 failures were 30 s timeouts (no assertion mismatch) in `customer-contacts` and `customer-links` while the machine load average was ~31–36 from parallel M9 runs. Rerunning those two feature files: 12/12 passed. Status → in-review.

## Parking lot
- `workspace_member.user_id` cascade can leave a shared workspace without an admin when a user is deleted. Handle it in the M10 user-deletion flow.
