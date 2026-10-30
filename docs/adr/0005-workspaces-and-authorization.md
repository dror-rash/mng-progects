# ADR-0005: Workspaces, roles, and invite links

- **Status:** accepted
- **Date:** 2026-10-26

## Context
Every project, task and customer belongs to the user who created it (`project.owner_id`, `organization.owner_id`; tasks inherit through their project). Nothing can be shared, and tasks can't be assigned to anyone. M8 lets a team work together. This decides who can see and change what, which touches every query and is hard to undo.

## Decision
- **Workspaces own the data.** New `workspace` (id, name, created_at) and `workspace_member` (workspace_id, user_id, role, joined_at; primary key on both ids). `project` and `organization` get a required `workspace_id`; tasks, contacts and notes inherit through their parent. `owner_id` stays as "created by" (nullable, cleared if that user is deleted, so shared work stays).
- **Access rule.** A user can see and change a record if, and only if, they are a member of the record's workspace. One helper (`requireMembership(workspaceId, { role? })`) is the only way pages and actions check access; the existing `getOwned*`/`requireOwned*` helpers become member-scoped versions of themselves.
- **Roles.** `admin` and `member`. Members create, edit and delete projects, tasks and customers. Admins also manage invite links, remove members, change roles, and rename or delete the workspace. A workspace always keeps at least one admin (the last admin can't leave or be demoted).
- **Personal workspace.** Every user gets one on first use ("<name>'s workspace", admin). The migration creates one per existing user and moves their projects and customers into it, so nothing changes for existing data. Someone who left or was removed from it is never added back: if they belong to no workspace, they get a new one.
- **Current workspace.** Lists and "create" forms use the current workspace, kept in a cookie and validated against membership on every request (invalid → first workspace the user belongs to). A header switcher changes it. Record URLs stay as they are (`/dashboard/projects/<id>`); a link works for any member because access is checked against the record's own workspace, not the cookie. Forms that act on the current workspace post its id, and the server checks membership for that id (the cookie may have changed in another tab).
- **Invite links.** Admins create a link (`/dashboard/invite/<token>`), valid for 7 days, and can revoke it. Only a SHA-256 hash of the token is stored. A signed-in user who opens a valid link becomes a member (visitors sign in or sign up first, then return through `safeNext`). Links are reusable until they expire or are revoked.
- **Assignees.** `task.assignee_id`, nullable, must be a member of the task's workspace. Removing a member clears their assignments in that workspace. A "My tasks" view lists open tasks assigned to me across my workspaces.
- **Note authors.** `organization_note.author_id` records who wrote each note (parked from task 015).

## Alternatives considered
- **Per-project sharing** (invite people to individual projects) – finer control, but every list, customer and dashboard count needs its own permission join, and customers would need separate sharing.
- **Workspace in the URL** (`/w/<slug>/projects/…`) – explicit, but changes every route and makes record links break when a workspace is renamed; record-level checks give the same safety.
- **Email invitations** – nicer for the invitee, but needs an email provider, secrets and deliverability work first. Invite links can be pasted into any channel.
- **Postgres row-level security** – a second line of defence, but adds a per-request session variable to the connection pool and complicates migrations. Revisit once the app-level rule is stable.
- **A read-only Viewer role** – not needed yet; the role column allows adding it.

## Consequences
- **Good:** one access rule for everything; teammates see the same customers and projects; existing users keep their data in a personal workspace; no email infrastructure needed.
- **Bad / trade-offs:** every query and action changes from owner scope to membership scope — a large, careful migration with cross-workspace tests for each page and action. Reusable invite links can be forwarded; mitigated by expiry, revocation, and an admin-visible member list.
- **Follow-ups:** email invites, Viewer role, row-level security, per-user time zones (parked since task 010), audit history.

## Rollout (milestone M8)
1. Workspaces and membership; migrate existing data into personal workspaces; switch every query and action to membership checks (no visible change for a single user).
2. Members page, roles, invite links, leave/remove.
3. Workspace switcher and creating extra workspaces.
4. Task assignees and "My tasks"; note authors.

## Amendment 2026-10-30: renaming and deleting a workspace (task 029)
- Only admins rename or delete a workspace, from `/workspace/settings`. Both actions lock the workspace row and check the role again under the lock, as membership changes do.
- Deleting needs the workspace's exact name typed, and removes everything in it through `ON DELETE CASCADE` from `workspace`: projects (and their tasks), customers (and their contacts and notes), invite links and memberships. Nothing is moved to another workspace.
- An admin may delete their only workspace. Like anyone who belongs to no workspace, they get a new personal one on their next page load. Former members land in their next workspace.
