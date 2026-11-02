---
name: lane-merge
description: Finish a lane after its PR is merged (or merge a lane's branch into a combined branch) - verify, merge, then remove the worktree and database with scripts/lane.sh down. Use when a task's PR has merged or the user says "merge lane N".
---

# Merge and remove lane `<n>`

1. Find the lane's branch: `scripts/lane.sh list`.
2. **Find out where it goes:**
   - **A PR to `main`:** check `gh pr view <branch> --json state,statusCheckRollup`.
     - If it's open, merge it only when `verify` and `e2e` pass (`deploy` fails until M11): `gh pr merge <n> --merge`. Repository merges are merge commits.
     - If it's already merged, go on.
   - **A combined branch** (for example, several M13 tasks before one PR):
     - in the main checkout, `git switch <combined>` and `git merge --no-ff <branch>`;
     - on a migration-number clash, regenerate the later task's migration with `pnpm db:generate`, as M9 did; never rename an applied one;
     - then run `pnpm test` and `pnpm test:e2e` on the combined branch.
3. **Clean up:**
   - `scripts/lane.sh down <n>`. It refuses a dirty worktree, so commit or report what's left rather than forcing it;
   - delete the remote branch only if the PR merged and GitHub didn't already.
4. **Update the docs:** in the next docs commit, set the task to `done` and update the plan's milestone and change log.
