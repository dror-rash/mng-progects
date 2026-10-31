# Task 051: Soft delete everywhere, the Deleted view and restore

- **Status:** in-progress
- **Milestone:** M12 Partner Access
- **Zone / package:** `apps/dashboard`, `packages/db`, `e2e`
- **Feature file:** `docs/features/soft-delete.feature` (and `docs/features/partner-access.feature`)
- **Depends on:** tasks 046–050, ADR-0006, design `docs/superpowers/specs/2026-10-31-partner-access-design.md` (rules 8, 8a, 8b, 8c; the "Delete …" and "See and restore anything deleted" rows), plan `docs/superpowers/plans/2026-10-31-partner-access.md`

## Why
All deletes become soft (rule 8): projects, tasks, customers, contacts, notes and partners. A deleted item disappears from every normal view for everyone; admins see a Deleted page and restore from it, auditors see that page without Restore, partners never see it. Migration 0018 already added `deleted_at` / `deleted_by` and the access functions already treat deleted rows (a partner never sees a deleted project; nobody changes one; a deleted customer or partner ends the partner's access). Nothing sets the columns yet: every delete is still a hard delete.

## Scope
- Every delete action sets `deleted_at = now(), deleted_by = <me>` instead of deleting: `deleteProjectAction`, `deleteTaskAction`, `deleteTaskFromPageAction`, `deleteCustomerAction`, `removeContactAction`, `deleteNoteAction`. Same people as before (projects and tasks: whoever can change the project, partners included; customers, contacts and notes: admins).
- `deletePartnerAction` (admins), a "Delete partner" button on the partner page.
- `features/deleted/deleted-kind.ts`: `DELETED_KINDS` (Project, Task, Customer, Contact, Note, Partner), `parseDeletedKind`, `deletedKindLabel`.
- `features/deleted/queries.ts`: `listDeleted(userId, workspaceId)`: the workspace's items with their own `deleted_at`, newest first, with where they were (a task's project, a contact's or note's customer) and who deleted them. Admins and auditors only.
- `/deleted` (`app/deleted/page.tsx`): the Deleted page for admins and auditors, not found for partners; Restore buttons for admins only. A "Deleted" link in the header for admins and auditors.
- `restoreAction(prev, formData)` (`kind`, `id`): admins only; anyone else, and a made-up id, get the same "Not found". Restoring checks the parent (ruling 20): a task whose project is still deleted gets "Restore its project first"; a contact or note whose customer is still deleted gets "Restore its customer first".
- A deleted project hides its tasks (rule 8a, through `can_see_project` and the list filters); restoring it brings them back. Tasks deleted on their own stay deleted.
- A deleted customer: partners lose sight of its projects (rule 8b), admins and auditors keep them; contacts and notes are no longer removed with it (no cascade) and come back with it.
- A deleted partner (rule 8c): its users lose access to the workspace and land like someone without it (their other workspaces, or a personal one; never an error page); its invite links say "This invite link is no longer valid" (`find_invite` / `join_workspace`); restoring the partner gives everything back.
- Deferred from 047: a deleted partner's user no longer gets "No workspace": `ensurePersonalWorkspace` counts only memberships that give access (`access_role`).
- Leak suite: a deleted project of another partner stays not found.

## Out of scope
- Workspace delete stays a hard delete (ADR-0005 amendment, task 029); revoking an invite link stays as it is.
- Purging deleted items after a retention period (design Parking lot).

## Acceptance criteria
- [ ] A deleted project disappears (lists, its page and its tasks' pages are not found) and an admin restores it with its tasks; a task deleted on its own before stays deleted, and restoring it while its project is deleted says "Restore its project first".
- [ ] A deleted task disappears and an admin restores it.
- [ ] Deleting a customer hides its partner projects from the partner; an admin still sees them; restoring the customer brings them back. A contact or note of a deleted customer can't be restored before it ("Restore its customer first").
- [ ] Deleting a partner removes its users' access: they land in their personal workspace; the partner's invite link says "This invite link is no longer valid"; restoring the partner restores their access.
- [ ] Auditors see the Deleted page without Restore.
- [ ] Partners never see deleted items or the Deleted page.
- [ ] A deleted project of another partner stays not found (leak suite).

## Approach (brief)
- A new migration: admins may update a deleted project (`project_update` only allows `can_change_project`, which is false for a deleted one), so Restore works under row-level security; `find_invite` returns whether the invite's partner is deleted, and `join_workspace` refuses its invites.
- Restore and delete actions do their checks and the write in one `withAccess`; refusals throw "Not found".
- `RestoreForm` (client, `useActionState`) gets only `kind`, `id` and the item's name.

## Test plan
- Unit: `features/deleted/deleted-kind.test.ts`; `invite-token.test.ts` (a deleted partner's invite).
- DB: `packages/db/src/soft-delete.db.test.ts` (`hides deleted projects from partners but not admins`, partner soft deletes, admin restore, auditor refusal, invites of a deleted partner).
- Acceptance: `docs/features/soft-delete.feature` (`@task:051`), a new `@task:051` scenario in `docs/features/partner-access.feature`.

## Progress log
- 2026-11-01 – Drafted from the task 051 brief, the deferred items (047 review: a deleted partner's user gets "No workspace"; ruling 4: a deleted partner's invite link; 048 review: `clear_unseen_assignments`) and controller rulings 7 (not found looks like a made-up id), 20 (restore checks the parent) and 21 (who may delete and restore; the Deleted page is not found for partners).

## Parking lot
- `clear_unseen_assignments` (task 048) clears a user's assignments on tasks they can't see, which includes soft-deleted partner projects; restoring such a project doesn't bring those assignments back (acceptable, from the 048 review).
