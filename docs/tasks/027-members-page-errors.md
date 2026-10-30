# Task 027: Members page errors and admin checks

- **Status:** done
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
- [x] Demoting or removing the last admin shows "A workspace needs at least one admin" on that row.
- [x] Removing someone who was already removed in another tab shows "Not a member of this workspace".
- [x] Revoking a link that was already revoked shows an error on that row.
- [x] A member who sends change role, remove or revoke requests directly gets "Only admins can manage this workspace", and nothing changes.
- [x] An admin who removes a member and ticks "Also revoke open invite links" leaves the workspace with no open links, so the old link no longer lets that person rejoin.
- [x] The copy button copies the link and says "Copied".

## Approach (brief)
Turn `changeRoleAction`, `removeMemberAction` and `revokeInviteAction` in `features/workspaces/actions.ts` into `(prev, formData) => FormState` and map `changeMembership` results to messages. Only edit those functions in `actions.ts`: task 028 edits `joinWorkspaceAction` in the same file. Add a `listMemberOptions(workspaceId)` (id, name) for client forms; keep `listMembers` (with email) for the server-rendered members list.

## Test plan
- Acceptance: the scenarios above in `workspace-members.feature`, tagged `@task:027`.
- Unit: the result-to-message mapping.
- Storybook: the copy button (idle, copied).

## Progress log
- 2026-10-30 – Drafted from the task 023 and 026 parking lots.
- 2026-10-30 – Scenarios added to `workspace-members.feature` (`@task:027`, 10 incl. a 3-example outline). Red: 9 of 10 failed for the right reasons (error page instead of a row error; no "Also revoke…" checkbox; no "Copy invite link" button); the forged-form outline first timed out in setup (a step bug, fixed in the second `test:` commit; the outline is tagged `@slow` since it drives two people through three workspace switches). Unit red: `membership-errors.test.ts`, `copy-button.test.tsx` (modules missing).
- 2026-10-30 – Green: `changeRoleAction`, `removeMemberAction`, `revokeInviteAction` take `(prev, formData)` and return `FormState`; `membershipError()` maps `changeMembership` results (also used by leave); `assertDone`/`requireAdmin` removed. Revoke only matches open links ("This invite link was already revoked"). Remove can revoke all open links in the same transaction (ADR-0005 amendment). Client forms in `features/workspaces/member-forms.tsx`; `CopyButton` in `packages/ui` with story (Idle, Copied). `listMemberOptions` (userId, name) feeds the assignee picker.
- 2026-10-30 – Results: all 12 task-027 tests pass (in `workspace-members` runs the only failures were 30s timeouts in pre-existing long scenarios); full suite 108/112, the 4 failures are 30s timeouts on a loaded shared machine (cold dev compiles), "A project card shows its customer", "Assign a task to a teammate" and "A members page left open…" pass on a targeted rerun; `task-assignees` scenarios keep hitting the 30s limit at varying steps (cold compiles, sign-up 4s+) while the assignment itself works ("Assigned to Teammate" shows). Unit 166 (dashboard 123, ui 25, auth 13, db 5); lint and typecheck clean.
- 2026-10-30 – On `feat/m9-polish`: with both admin checks disabled (`adminContext` and the check under the lock in `changeMembership`), all 3 examples of "A member can't use admin actions by changing the form" failed at "the teammate sees the error \"Only admins can manage this workspace\"". Restored; the full suite passes 146/146.
- 2026-10-30 – Merged to `main` in PR #12 (M9). Combined branch: 146/146 e2e, 223 unit tests, lint and typecheck clean. The Storybook build on Node 22 (CI) was fixed in PR #13.

## Parking lot
- `listMemberOptions` returns `userId` (not `id`) so `EditTaskForm`'s `MemberOption` stays as is.
- Long multi-person scenarios run close to the 30s timeout on a loaded dev machine; consider a higher local timeout or `@slow` for them.
