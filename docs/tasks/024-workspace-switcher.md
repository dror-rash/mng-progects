# Task 024: Workspace switcher and new workspaces (M8 step 3)

- **Status:** in-progress
- **Milestone:** M8
- **Zone / package:** `apps/dashboard`
- **Feature file:** `docs/features/workspace-switching.feature`
- **ADR:** `docs/adr/0005-workspaces-and-authorization.md`

## Why
After joining a workspace (task 023) there is no way back to your own, and nobody can start a second workspace for another team.

## Scope
- `/dashboard/workspaces` (the workspace name in the header links here): my workspaces with my role; the current one is marked and links to "Members and invites"; others have "Switch to <name>".
- "New workspace" form: name required (≤ 100 characters); creates the workspace with me as admin and switches to it.
- Switching sets the workspace cookie after checking membership on the server.
- Joining through an invite link also creates the joiner's personal workspace if they have none, so they can always switch back.

## Out of scope
- Renaming or deleting a workspace (parking lot); assignees (025).

## Acceptance criteria
- [ ] I can create a second workspace, and its lists don't show my other workspace's projects.
- [ ] I can switch back and see my projects again.
- [ ] A blank workspace name shows an error.
- [ ] A teammate who joined my workspace can switch back to their own.

## Approach (brief)
`parseWorkspaceName` (pure, unit-tested); `switchWorkspaceAction` and `createWorkspaceAction` set the cookie; current-workspace validation (task 022) already ignores a cookie for a workspace you're not in.

## Test plan
- Acceptance: `workspace-switching.feature` (4 scenarios).
- Unit: workspace name parsing.

## Progress log
- 2026-10-26 – Task created.

## Parking lot
- Rename and delete a workspace (admins).
