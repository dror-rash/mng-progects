# Task 027: Members page errors and admin checks

- **Status:** todo
- **Milestone:** M9
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/workspace-members.feature`
- **ADR:** `docs/adr/0005-workspaces-and-authorization.md`

## Why
Admins who hit a rule (last admin, someone already removed) land on the error page instead of seeing what went wrong. A removed member can also rejoin with an old link.

## Scope
- Change role, remove member and revoke link return `FormState` errors on their row (`useActionState`), like "Create invite link" already does. No more `assertDone` throws for expected outcomes.
- When removing a member, the admin can also revoke the workspace's open invite links (a checkbox on the remove form, off by default). Record the rule in ADR-0005.
- An acceptance test where a member posts each admin action directly (forged form) and the server refuses it.
- A copy-to-clipboard button next to a new invite link (small client island).
- Member lists sent to client forms (assignee pickers, members page forms) carry only `id` and `name`, not email.

## Out of scope
- The invite page and joining (task 028).
- Renaming or deleting a workspace (task 029).

## Acceptance criteria
- [ ] Demoting or removing the last admin shows "A workspace needs at least one admin" on that row.
- [ ] Removing someone who was already removed in another tab shows "Not a member of this workspace".
- [ ] Revoking a link that was already revoked shows an error on that row.
- [ ] A member who sends change role, remove or revoke requests directly gets "Only admins can manage this workspace", and nothing changes.
- [ ] An admin who removes a member and ticks "Also revoke open invite links" leaves the workspace with no open links, so the old link no longer lets that person rejoin.
- [ ] The copy button copies the link and says "Copied".

## Approach (brief)
Turn `changeRoleAction`, `removeMemberAction` and `revokeInviteAction` in `features/workspaces/actions.ts` into `(prev, formData) => FormState` and map `changeMembership` results to messages. Only edit those functions in `actions.ts`: task 028 edits `joinWorkspaceAction` in the same file. Add a `listMemberOptions(workspaceId)` (id, name) for client forms; keep `listMembers` (with email) for the server-rendered members list.

## Test plan
- Acceptance: the scenarios above in `workspace-members.feature`, tagged `@task:027`.
- Unit: the result-to-message mapping.
- Storybook: the copy button (idle, copied).

## Progress log
- 2026-10-30 – Drafted from the task 023 and 026 parking lots.

## Parking lot
