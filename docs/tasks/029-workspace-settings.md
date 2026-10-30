# Task 029: Rename and delete a workspace

- **Status:** todo
- **Milestone:** M9
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/workspaces.feature`
- **ADR:** `docs/adr/0005-workspaces-and-authorization.md` (add the delete rule)

## Why
Admins can't fix a workspace's name or remove one they no longer need. Two workspaces with the same name look identical in the switcher.

## Scope
- A workspace settings page (`/workspace/settings`, admins only) to rename the workspace and to delete it after typing its name to confirm.
- Deleting removes the workspace and everything in it (projects, tasks, customers, invites, memberships). The current admin is switched to another workspace, or a new personal one is created if they have none left.
- The switcher tells same-named workspaces apart (role and member count, for example "Acme · Admin · 3 members").
- Workspace name inputs get `maxLength={100}`, and the error says "100 characters or fewer" (100 is accepted today, but the message says "under 100").

## Out of scope
- Transferring a workspace's data to another workspace.

## Open questions (decide before coding)
- Can someone delete their **only** workspace? Proposed answer: yes, and they get a fresh personal workspace on their next page load.

## Acceptance criteria
- [ ] An admin renames the workspace; the header and switcher show the new name.
- [ ] A member can't open settings and can't rename or delete by posting the form.
- [ ] Deleting needs the exact name; afterwards its projects are gone for every former member, and the admin lands in another workspace.
- [ ] Two workspaces named "Acme" can be told apart in the switcher.
- [ ] A 101-character name shows "Workspace name must be 100 characters or fewer".

## Approach (brief)
Put the new actions in `features/workspaces/settings-actions.ts` so `actions.ts` (tasks 027 and 028) doesn't conflict. Use `requireWorkspaceForAction` plus the role check. Delete inside one transaction that locks the workspace row (as `changeMembership` does). Rely on existing `ON DELETE CASCADE` from workspace, and confirm it covers every table before writing the delete.

## Test plan
- Acceptance: the scenarios above in `workspaces.feature`, tagged `@task:029`.
- Unit: `parseWorkspaceName` boundary (100/101), switcher label helper.
- Storybook: delete-confirmation form states.

## Progress log
- 2026-10-30 – Drafted from the task 024 and 026 parking lots.

## Parking lot
