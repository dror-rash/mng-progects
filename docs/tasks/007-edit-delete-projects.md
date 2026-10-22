# Task 007: Edit and delete projects

- **Status:** todo
- **Milestone:** M4
- **Zone / package:** `apps/dashboard`
- **Feature file:** `docs/features/project-tasks.feature` (or a new `project-settings.feature`)

## Why
Users can create projects but can't fix a typo or remove a finished project.

## Scope
- Rename a project and change its description from the project page.
- Delete a project (with its tasks) after a confirmation step.
- Owner-only, same check as task actions.

## Out of scope
- Archiving, sharing projects with other users.

## Acceptance criteria
- [ ] Renaming a project shows the new name on the project page and the dashboard.
- [ ] Deleting a project removes it from the dashboard.
- [ ] Another user cannot edit or delete my project.

## Approach (brief)
Server actions in `features/projects/` reusing `getOwnedProject`; move it there from `features/tasks/` when this second consumer appears.

## Test plan
- Acceptance: scenarios above.
- Unit: input validation (empty name rejected).

## Progress log
- 2026-10-22 – Task created.

## Parking lot
