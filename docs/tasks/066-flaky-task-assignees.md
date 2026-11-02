# Task 066: Flaky task-assignees scenarios under local load

- **Status:** todo
- **Milestone:** unscheduled (test health; found during task 053)
- **Zone / package:** `e2e`
- **Feature file:** `docs/features/task-assignees.feature` (behavior unchanged)

## Why
Flaky tests are bugs (CLAUDE.md). Locally, several `task-assignees.feature` scenarios fail at random when the whole suite or the whole feature runs in parallel against dev servers, then pass on their own. The same happens on `main` (2026-11-02: 4 of 10 failed on `main`, 5 of 10 on the task 053 branch, a different set each run). CI (production builds) passes.

## Scope
- Find why steps that save a task and wait for the redirect (`the task {string} is assigned to {string}`, `I am on the {string} project page`, `I move the task … to …`) time out under parallel load: a step that doesn't wait for the action's response before navigating, a race with a prefetch, or just slow dev compiles past the 15s expect timeout.
- Fix the step (wait on the right signal) or the app (if a redirect really is lost). No retries, and no longer timeouts as the only fix.

## Out of scope
- Changing any scenario's behavior.

## Acceptance criteria
- [ ] `task-assignees.feature` passes 5 runs in a row locally with the default workers, against freshly started dev servers.
- [ ] The full suite passes locally with no failures in this feature.

## Approach (brief)
Reproduce with `--repeat-each=5` on the feature, read the traces (`trace: retain-on-failure`), compare the failing step's waits with `pressAndWait` in `workspaces.steps.ts`.

## Test plan
- Acceptance: the existing scenarios, repeated.

## Progress log
- 2026-11-02 – Drafted from the task 053 verification run.
- 2026-11-02 – Seen again on task 059: "My tasks lists tasks from every workspace I'm in…" fails even on its own against dev servers. The whole scenario (two workspaces, two projects, two assignments) hits Playwright's 30s test timeout while going back to the board; project pages now load visits, photos and the crew too. Look at the per-test timeout for long scenarios, or at making the steps lighter.

## Parking lot
