---
name: task-start
description: Start a task from docs/tasks in its own lane - planner readiness check, worktree, branch, database and ports via scripts/lane.sh, task status in-progress. Use when the user or the orchestrator says "start task NNN" or before running the pipeline for a task.
---

# Start task `<id>` in lane `<n>`

The arguments are a task id (e.g. `056`) and, optionally, a lane number. Without a lane number, pick the lowest free one from `scripts/lane.sh list`.

1. **Readiness check.** Read `docs/tasks/<id>-*.md`. If it doesn't exist, or its Status isn't `todo`, stop and say why. Then ask the `planner` agent for a readiness check: "Is task <id> READY? Check dependencies, open questions and scenario coverage." If the answer is NOT READY, stop and relay the reasons and questions to the user.
2. **Branch name:** `feat/<slug>` from the task file name (`056-workers.md` → `feat/workers`), or `chore/<slug>` for tooling and infra tasks.
3. **Base branch:** `origin/main` (after `git fetch`). If a dependency is merged into another branch that isn't in `main` yet, base on that branch and say so.
4. **Create the lane:** `scripts/lane.sh up <n> <branch> <base>`. The local Postgres must be up (`pnpm db:up`).
5. **Mark the task started.** In the lane's worktree:
   - set the task's Status to `in-progress`;
   - add a dated Progress-log line naming the lane;
   - commit `docs: task <id> in progress (lane <n>)`.
6. Report the lane number, path, branch, shell URL (`http://localhost:30<n>0`) and database.

Don't remove `@wip` here: the spec-writer does that in the task's `test:` commit.
