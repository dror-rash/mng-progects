# Task 056: The worker role and project crews

- **Status:** todo (feature file in review)
- **Milestone:** M13 Sites & Field Data
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/workers.feature`; `roles.feature` "Admins invite admins or auditors" updated (the Role select gains Worker)
- **Depends on:** task 055; ADR-0008 (worker role, crews); design `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` ("Roles", "Access")

## Why
Internal technicians do the field work. They need the projects they're sent to, with the site, the people
to meet and the tasks, and nothing else: no other projects, no customer pages, no project settings.

## Rules (design, owner-approved; *my call* items from the design's Roles table are marked)
- A new membership role, `worker` ("Worker"), with no partner. Admins invite workers and change members to and from Worker, as for the other roles.
- **Crew:** `project_worker` (`project_id`, `user_id`). Admins add a workspace's workers to a project's crew, and remove them, from the project page (*my call*). Any project in the workspace, internal or a partner's.
- **What a worker sees:** the projects whose crew they're on (not deleted), with their tasks, sites and on-site contacts. Customers by name only (no customer pages, like partners). No Partners or Deleted pages.
- **What a worker does** in a crew project: add tasks, edit them, change their status, assign them (*my call*). They can't delete tasks, change the project's settings, cancel, copy or delete it, or create projects (*my call*).
- **Assignees:** a crew project's workers can be assigned its tasks, besides today's choices (admins, and the partner's users for a partner's project).
- **Leaving a crew** (or the workspace, or becoming another role) clears the worker's assignments in the projects they no longer see, like task 052 does for demoted admins.

## Scope
- **Schema (migration 0029):**
  - `workspace_member.role` and `workspace_invite.role` checks allow `worker`.
  - `project_worker` (`project_id` → project ON DELETE CASCADE, `user_id` → user ON DELETE CASCADE, `workspace_id`, `added_by`, `created_at`; primary key on project and user). A trigger (or composite key) keeps the user a worker member of the project's workspace when added.
  - Policies: admins and auditors of the workspace read crews; a worker reads their own rows; admins add and remove.
- **Access (same migration):**
  - `can_see_project` also: a worker on the project's crew, project not deleted.
  - New `can_work_on_project(user, project)`: `can_change_project`, or a worker on the crew (project not deleted). The task insert and update policies use it; task delete (and `delete_task`) keeps `can_change_project`.
  - `can_see_customer_name` also: a worker, for the customer (and its parent) of a project they can see.
  - `can_see_site` needs no change: it follows `can_see_project` (task 055).
  - A crew removal clears the removed worker's assignments in that project (`remove_crew_member`, `SECURITY DEFINER`, admins only), and `clear_unseen_assignments` already covers role changes and removal.
- **App:**
  - `roles.ts`: Worker in `WORKSPACE_ROLES` and the assignable roles; the invite and member role selects offer it.
  - `scope.ts`: workers don't see customer, partner or Deleted pages and can't create projects (a new `canCreateProjects`); pages and actions that use `canChange(role)` for project-level changes check the project's `canChange`, and task forms check a new `canWork` from `can_work_on_project`.
  - Project page: a "Crew" section (workers on the crew; for admins an "Add to crew" select of the workspace's workers not on it, and "Remove <name>"). Edit, Copy, Cancel and Delete stay hidden for workers (`can_change_project` is false); Add task and the board's moves show (`canWork`).
  - Task page: workers edit; no "Delete task".
  - Assignee choices and `isAssignable` include the project's crew.
- **Leak suite:** a worker's non-crew project, task, and site stay not found; posting forms for them is refused like a made-up id; a worker's delete and project edit posts are refused.

## Out of scope
- Field data (visits, photos, readings, reports): tasks 057–061.
- Workers in the demo seed (*parked*: add a demo worker later if useful).
- A worker's "my calls" list or schedule (open question in the design).

## Acceptance criteria
- [ ] A worker sees only their crew's projects, and other projects and tasks are not found. ("I see only my crew's projects", "A project I'm not on the crew of…")
- [ ] A worker adds, edits and moves tasks but can't change, copy, cancel or delete the project, delete tasks or create projects. ("I work on my crew's tasks…", "I can't create projects")
- [ ] Customer names only; the site with its contacts, read-only. ("I see customer names…", "I see my project's site…")
- [ ] Crew workers can be assigned; leaving the crew hides the project and clears the assignments. ("My crew's tasks…", "Leaving a crew…")
- [ ] Admins manage crews; workers and auditors don't. ("An admin puts a worker…", "Only admins see and change the crew")
- [ ] Admins invite workers. ("Admins invite workers"; `roles.feature`)
- [ ] Tampered forms are refused. ("My forms are refused…")

## Approach (brief)
- Migration and DB tests first (`packages/db/src/workers.db.test.ts`): role checks, crew rows, `can_see_project` and `can_work_on_project` for crew and non-crew workers, task policies, customer names, `can_see_site` through a crew project, the crew-removal function.
- Unit: `roles.test.ts` (Worker), `scope.test.ts`.
- No new ADR: ADR-0008 covers the role and crews.

## Test plan
- **Acceptance:** `workers.feature` (`@task:056`), the updated `roles.feature` scenario, and every existing scenario.
- **New steps:** `I am signed in as a worker`, `I am on the crew of {string}`, `the admin adds {string} to the crew`, `the admin removes {string} from the crew`, `the admin sees the {string} section shows {string}`, `the task {string} is assigned to me by the admin`, `I post the delete form of the task {string}`, `I post the edit form of the {string} project with the name {string}`, `the admin opens the {string} project page`, `the admin sees the project {string}`, `the auditor sees no {string} button and no {string} link` (exists).
- **Storybook:** `CrewSection` (with workers, empty, admin with the add form, read-only).

## Progress log
- 2026-11-02 – Drafted with the feature file (in review; scenarios `@wip`).

## Parking lot
- A demo worker in the seed.
- Partner technicians on crews (today a partner's users see all of their partner's projects).
