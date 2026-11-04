# Task 073: The guard sees applied migrations through symlinked paths

- **Status:** in-progress
- **Milestone:** POC (2026-11-13), tooling
- **Zone / package:** `.claude/hooks/guard.sh`, `scripts/test-hooks.sh`
- **Feature file:** none (developer tooling, no user-visible behavior). Tested by `scripts/test-hooks.sh`.
- **Depends on:** 067

## Why
The guard compares an edited file's path with `git rev-parse --show-toplevel`, which resolves symlinks. When the repo is reached through a symlink (on macOS `/tmp` and `/var` are symlinks), the paths don't match, and an edit to an applied migration is let through. Found while extracting the team into the agent-team-setup skill.

## Scope
- Resolve the edited file's directory physically (`pwd -P`) before comparing it with the repo root.

## Out of scope
- Other guard rules.

## Acceptance criteria
- [ ] Editing an applied migration through a symlinked path to the repo is refused (`scripts/test-hooks.sh`).

## Test plan
- `scripts/test-hooks.sh`: a case that edits an applied migration through a symlink to the repo.

## Progress log
- 2026-11-04 – Started in lane 1.

## Parking lot
- none
