# Task 023: Members, roles and invite links (M8 step 2)

- **Status:** in-review
- **Milestone:** M8
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/workspace-members.feature`
- **ADR:** `docs/adr/0005-workspaces-and-authorization.md`

## Why
Workspaces exist (task 022) but nobody can join one. This lets an admin invite teammates and manage who is in the workspace.

## Scope
- Schema: `workspace_invite` (id, workspace_id, token_hash unique, created_by, created_at, expires_at, revoked_at).
- Members page `/dashboard/workspace` (the workspace name in the header links to it): members with name, email and role; "Leave workspace".
- Admins only (checked on the server for every action): make admin / make member, remove a member, create an invite link (shown once; valid 7 days), list and revoke active links.
- `/dashboard/invite/<token>`: signed-out visitors go to login and come back; a valid link shows "Join <workspace>"; joining adds the user as a member and switches them into that workspace (cookie). Invalid, expired or revoked links say "This invite link is invalid or has expired".
- A workspace always keeps at least one admin: the last admin can't leave or be made a member.

## Out of scope
- Switcher and creating more workspaces (024); assignees (025); email invites; a Viewer role.

## Acceptance criteria
- [x] An admin creates an invite link; a teammate who joins sees the workspace's projects, and appears on the members page.
- [x] A removed member can no longer open the workspace's projects.
- [x] A member doesn't get admin controls.
- [x] A revoked link can't be used.
- [x] The last admin can't leave.
- [x] A signed-out visitor opening an invite link is sent to log in.

## Approach (brief)
Pure helpers in `features/workspaces/` (roles, invite token/hash/expiry/state, "keeps an admin" rule) with unit tests; `requireAdmin(workspaceId)` for admin actions; SHA-256 via `node:crypto`.

## Test plan
- Acceptance: `workspace-members.feature` (6 scenarios) with a second browser context for the teammate.
- Unit: roles, admin-keeping rule, invite helpers.

## Progress log
- 2026-10-26 – Task created.
- 2026-10-26 – Migration `0013` adds `workspace_invite`. 6 scenarios red → green (stable over 3 repeats) using a `people` fixture that closes extra browser contexts; unit tests for roles, the admin-keeping rule and invite tokens. Full suite 83/83 twice. The workspace name in the header links to the members page.

## Parking lot
- Test that the server refuses a member's direct admin request (today the UI hides the controls and every admin action calls `requireAdmin`, but no test sends the request).
- Copy-to-clipboard button for a new invite link.
