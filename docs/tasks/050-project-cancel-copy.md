# Task 050: Cancel a project, or copy it to a new one

- **Status:** done
- **Milestone:** M12 Partner Access
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/project-cancel-copy.feature` (and `docs/features/partner-access.feature`)
- **Depends on:** tasks 046–049, ADR-0006, design `docs/superpowers/specs/2026-10-31-partner-access-design.md` (rules 4a and 4b; the "Cancel a project, or copy it to a new one" row), plan `docs/superpowers/plans/2026-10-31-partner-access.md`

## Why
A project's owner never changes (rule 4a). To hand work to another partner, or between internal and a partner, an admin copies the project into a new one with the new owner and cancels the original. Canceled (rule 4b) is a status set by hand: the project keeps its tasks and stays visible, and shows "Canceled" in place of its task-derived status (task 043). Migration 0018 already added `project.status` (the Drizzle property `lifecycle`) and `project.copied_from_id`; nothing uses them yet.

## Scope
- `features/projects/project-lifecycle.ts`: `PROJECT_LIFECYCLE` (Active, Canceled), `parseProjectLifecycle`, `projectLifecycleLabel`.
- `features/projects/project-status.ts`: `canceled` ("Canceled") joins `PROJECT_STATUSES`, so the table and the Status filter show it; `projectStatus(counts, lifecycle)` is `canceled` for a canceled project whatever its tasks. All projects passes the lifecycle.
- The project page: "Cancel project" / "Reopen project" for anyone who can change the project (`can_change_project`: admins and the owning partner's users; never auditors). A canceled project shows "Canceled" and stays editable, tasks too.
- The project page: a "Copy to new project" link (same people) to `/projects/[projectId]/copy`: project name (starts with the source's), customer and, for admins in a workspace with partners, the Owner select. Partners copy only into their own partner (no Owner select).
- `copyProject(userId, sourceId, { name, ownerPartnerId, customerId })` in one `withAccess` transaction, as the signed-in user (row-level security applies to every insert): copies the description and the tasks that aren't deleted (title, description, status, priority, due date), no assignees, a task's customer only when the new owner may see its name, and sets `copied_from_id`. It refuses a source the user can't change, an owner the user may not create for, and a customer not allowed for the new owner, with the same refusal as a missing project.
- The copy's page shows "Copied from <name>" as a link only when the viewer can see the source; otherwise nothing.
- Leak suite: another partner's project can't be copied or canceled, and a copy doesn't reveal a source I can't see.

## Out of scope
- Soft delete and the Deleted view (task 051).

## Acceptance criteria
- [x] Cancelling a project shows it as Canceled on its page and in the projects table; the Status filter has "Canceled", which matches only canceled projects (and other values never match them).
- [x] Reopening brings back the task-derived status.
- [x] An admin copies a partner's project to another partner: the new project has the tasks, unassigned; the original is still listed.
- [x] A partner copies only into their own partner: no Owner select.
- [x] A task customer the new owner can't see is dropped in the copy.
- [x] An auditor sees no Cancel or Copy controls, and the copy page is not found for them.
- [x] Another partner's project can't be copied or canceled (same refusal as a made-up id); a copy's link to its source shows only to those who can see the source.

## Approach (brief)
- `features/projects/copy-project.ts` (`"use server"`): `copyProjectAction(prev, formData) → FormState`, which redirects to the new project. It resolves the owner like project creation (partners: their own partner; admins: the Owner select) and checks the customer, then calls `copyProject`.
- `features/projects/copy.ts`: `copyProject` (not an action, so it can't be called from a client), which checks everything again inside the transaction.
- `features/projects/actions.ts`: `setProjectLifecycleAction(formData)` for the Cancel / Reopen buttons. The owner and customer checks shared with creation move to `features/projects/project-owner-check.ts` (a `"use server"` file may only export actions), with `mayCreateFor` for `copyProject`'s owner check; `workspaceAccess` (`features/access/require-change.ts`) gives the role in the project's workspace, which may not be the current one.
- `ProjectForm` gets a `copyOf` mode (name, customer, owner; the description comes from the source).

## Test plan
- Unit: `project-lifecycle.test.ts`, `project-status.test.ts` (canceled).
- Acceptance: `docs/features/project-cancel-copy.feature` (`@task:050`), `docs/features/partner-access.feature` (new scenarios tagged `@task:050`).

## Progress log
- 2026-11-01 – Drafted from the task 050 brief and the controller's rulings 3 (`lifecycle`), 7 (not found looks like a made-up id), 18 (`copyProject` as the signed-in user in one `withAccess`; the copied-from link only for those who can see the source) and 19 (cancel/reopen for whoever can change the project; a canceled project stays editable).

- 2026-11-01 – Red: 9 of 9 `@task:050` scenarios fail (no Cancel / Copy controls, no copy page). Unit: `project-lifecycle` (no module), `projectStatus` canceled, `parseProjectStatus("canceled")`, `projectStatusLabel("canceled")`.
- 2026-11-01 – `project-lifecycle.ts`; `canceled` in `PROJECT_STATUSES` (last, so it sorts after Done) and `projectStatus(counts, lifecycle)`; Cancel / Reopen buttons and the copy link on the project page; the copy page and `ProjectForm`'s `copyOf` mode; `copyProject` and `copyProjectAction`. `@task:050` 9/9. No migration needed: 0018 added both columns, and the RLS project/task insert policies already hold a partner's copy to their own partner.
- 2026-11-01 – `pnpm lint`, `pnpm typecheck` clean; `pnpm test` 316 (dashboard 244, ui 51, auth 13, db 8); `pnpm --filter @repo/db test:db` 21/21; full e2e 195/195 at load average 10–26.

## Parking lot
- The project tiles (All projects, Home, a customer's page) don't show "Canceled"; only the table and the project page do.
- `copyProject`'s refusals (another owner for a partner, a customer the owner can't have) are reached only by a tampered form; the copy page never offers them. A dashboard-level DB test harness would let them be tested directly; the RLS DB tests already cover a partner inserting into another partner.
- A done task's `completed_at` isn't copied (the brief lists title, description, status, priority and due date), so a copied done task counts as completed before that column existed.
