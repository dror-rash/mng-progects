# Task 007: Edit and delete projects

- **Status:** done
- **Milestone:** M4
- **Zone / package:** `apps/dashboard`
- **Feature file:** `docs/features/project-settings.feature`

## Why
Users can create projects but can't fix a typo or remove a finished project.

## Scope
- "Edit project" link on the project page opens `/dashboard/projects/<id>/edit` to rename and change the description.
- "Delete project" link opens `/dashboard/projects/<id>/delete`, a confirmation page; confirming deletes the project and its tasks (DB cascade) and returns to the dashboard.
- Server-rendered forms only, no client JS.
- Owner-only, same check as task actions.

## Out of scope
- Archiving, sharing projects with other users.

## Acceptance criteria
- [x] Renaming a project shows the new name on the project page and the dashboard.
- [x] Deleting a project removes it from the dashboard.
- [x] Cancelling a delete keeps the project.
- [x] Another user cannot edit or delete my project (edit/delete pages show "Project not found"; actions re-check ownership).

## Approach (brief)
Server actions in `features/projects/` reusing `getOwnedProject`; move it there from `features/tasks/` when this second consumer appears.

## Test plan
- Acceptance: scenarios above.
- Unit: `parseProjectInput` — trims, rejects an empty name, stores an empty description as null.

## Progress log
- 2026-10-22 – Task created.
- 2026-10-22 – 5 acceptance scenarios red → green (stable over 5 repeats); 3 unit tests. Moved `getOwnedProject` to `features/projects/queries.ts`; `createProjectAction` now uses `parseProjectInput`. Full suite (27 e2e) green, lint + typecheck clean.
- 2026-10-22 – Merged in PR #1.

## Parking lot
- Show validation errors inline (today an empty name is blocked by `required`; the server throws as a backstop).
- Pages call `redirect("/login")` when there is no session; inside the `/dashboard` basePath that resolves to `/dashboard/login`. Middleware redirects first so it isn't hit today — fixed in task 008.
