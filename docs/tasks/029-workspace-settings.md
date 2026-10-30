# Task 029: Rename and delete a workspace

- **Status:** in-review
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
- [x] An admin renames the workspace; the header and switcher show the new name.
- [x] A member can't open settings and can't rename or delete by posting the form.
- [x] Deleting needs the exact name; afterwards its projects are gone for every former member, and the admin lands in another workspace.
- [x] Two workspaces named "Acme" can be told apart in the switcher.
- [x] A 101-character name shows "Workspace name must be 100 characters or fewer".

## Approach (brief)
Put the new actions in `features/workspaces/settings-actions.ts` so `actions.ts` (tasks 027 and 028) doesn't conflict. Use `requireWorkspaceForAction` plus the role check. Delete inside one transaction that locks the workspace row (as `changeMembership` does). Rely on existing `ON DELETE CASCADE` from workspace, and confirm it covers every table before writing the delete.

## Test plan
- Acceptance: the scenarios above in `workspaces.feature`, tagged `@task:029`.
- Unit: `parseWorkspaceName` boundary (100/101), switcher label helper.
- Storybook: delete-confirmation form states.

## Progress log
- 2026-10-30 – Drafted from the task 024 and 026 parking lots.
- 2026-10-30 – Started. Open question decided as proposed: deleting your only workspace is allowed; `ensurePersonalWorkspace` gives you a fresh personal workspace on the next page load. Eight scenarios in `workspaces.feature` (`@task:029`).
- 2026-10-30 – Red: 8/8 new scenarios failed for the expected reasons (no `/workspace/settings` page, no role and member count in the switcher, no `maxlength`); unit red: boundary, `confirmsWorkspaceName`, `workspaceDetails`, `ConfirmByName` missing. Green: all `@task:029` scenarios pass; the forged-form scenario was split in two (rename, delete) and two checks folded so the multi-person scenarios stay inside the 30s timeout under parallel load (9 scenarios now). Every table under `workspace` already cascades (members, invites, projects → tasks, organizations → contacts, notes), so delete is a single `DELETE` under the workspace row lock, with the admin role re-checked under the lock. Full suite 105/111 on a loaded machine: the 6 failures were cold-start timeouts / `ETIMEDOUT` in `authentication` and `customer-contacts` (untouched), and both files pass on rerun (9/9). Unit: dashboard 126, ui 25 (+3), auth 13, db 5. Lint and typecheck clean. Storybook: `ConfirmByName` (default, wrong name, pending, long name). ADR-0005 amended.

## Parking lot
- The rename form gives no "Saved" confirmation; the new name shows in the header and the field.
- The members page (`/workspace`, task 027) has no link to settings yet; it is linked from the workspaces page.
- Deleting a workspace doesn't warn how many projects and customers it holds.
