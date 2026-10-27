# Task 025: Task assignees, "My tasks" and note authors (M8 step 4)

- **Status:** done
- **Milestone:** M8
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature files:** `docs/features/task-assignees.feature`, `docs/features/customer-notes.feature`
- **ADR:** `docs/adr/0005-workspaces-and-authorization.md`

## Why
Teams share workspaces now (023, 024), but nobody can tell who is doing what. One assignee per task (the user's choice in ADR-0005) and a personal "My tasks" list fix that; notes record who wrote them.

## Scope
- Schema: nullable `task.assignee_id` (→ user, SET NULL, indexed); nullable `organization_note.author_id` (→ user, SET NULL). Existing rows stay unassigned / without author.
- Task page: "Assignee" select ("Unassigned" + the workspace's members); the server checks the assignee is a member of the task's workspace. Task page and board cards show "Assigned to <name>".
- Removing a member, or a member leaving, clears their assignments in that workspace.
- `/dashboard/my-tasks` ("My tasks" in the header): my open tasks across all my workspaces, with project, workspace, status and due date; ordered by due date (soonest first, undated last), then priority.
- Customer notes record and show their author ("by <name>").

## Out of scope
- Several assignees, notifications, filtering "My tasks".

## Acceptance criteria
- [x] A task can be assigned to a teammate; the task page and board show it.
- [x] "My tasks" lists my open tasks and drops them when done.
- [x] Removing a member clears their assignments.
- [x] Someone outside the workspace can't be assigned.
- [x] A new note shows its author.

## Approach (brief)
`assigneeId` follows the same three-state contract as `customerId` in `parseTaskInput`; `isMember` guards it; `byDueThenPriority` (pure, unit-tested) orders "My tasks".

## Test plan
- Acceptance: `task-assignees.feature` (5 scenarios) + 1 in `customer-notes.feature`.
- Unit: assignee parsing, "My tasks" ordering.

## Progress log
- 2026-10-26 – Task created.
- 2026-10-26 – Migration `0014` adds `task.assignee_id` (indexed) and `organization_note.author_id`. 5 scenarios red → green (stable over 2 repeats) + note-author scenario; assignee parsing and "My tasks" ordering unit-tested. Removing or leaving clears assignments in that workspace. Full suite 92/92 twice (after a dev-server restart at 5.8 GB).
- 2026-10-27 – Merged to `main` in PR #9 (M8). Full suite on `main`: 102/102 e2e, 159 unit tests, build green.

## Parking lot
