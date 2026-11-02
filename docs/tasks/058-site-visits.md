# Task 058: Site visits (online)

- **Status:** in-review
- **Milestone:** M13 Sites & Field Data (POC lane: 056 → 058 → 059)
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/site-visits.feature`
- **Depends on:** task 056 (crews, `can_work_on_project`); ADR-0008; design `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` ("Field data", "Roles")

## Why
The work happens at the site, over several visits. A visit is the anchor for everything captured there: notes now, photos (059) and readings (061) next, and offline capture later (063).

## Rules
- A visit belongs to a project; its site is the project's site. It has a date (`visited_on`, a calendar day, today by default, never in the future), the people who were there (at least one) and optional notes.
- **People who were there:** the people who can be assigned the project's tasks (admins, the partner's users for a partner's project, the crew's workers), the recorder checked by default (*my call*: app users only; others go in the notes).
- **Who records:** whoever can work on the project (`can_work_on_project`: admins, the partner's users, crew workers). Auditors read.
- **Who edits and deletes:** the visit's author, and admins (*my call*, the design's "delete only their own"). Delete is soft; admins restore from the Deleted page (a visit of a deleted project comes back with it).
- **Client ids:** the form carries an id made in the browser, so sending it twice records one visit (the second send lands on the same visit). Task 063 uses the same id for offline sync.

## Scope
- **Schema (migration 0031):**
  - `site_visit` (`id` from the client, `project_id`, `visited_on` date, `notes`, `created_by`, `created_at`, `updated_at`, `recorded_at`, `deleted_at`, `deleted_by`).
  - `site_visit_member` (`visit_id`, `user_id`; primary key on both).
  - Access: `can_see_visit` follows `can_see_project` (deleted visits for admins and auditors only, like tasks); insert needs `can_work_on_project` and `created_by` = the user; update and delete need `can_work_on_project` and (author or admin). Members follow their visit.
- **App:**
  - Project page: a "Visits" section (newest first by date: date, who, the notes' first line, link) and a "Record a visit" link for those who can work on the project.
  - Pages: `/projects/<id>/visits/new`, `/projects/<id>/visits/<visitId>` (heading "Visit on <date>", the site, who was there, notes; Edit and Delete for the author and admins), `/projects/<id>/visits/<visitId>/edit`.
  - Actions: create (idempotent on the client id: `insert … on conflict do nothing`, then the visit page), update, soft delete. People are checked against the project's choices ("Choose who was there from the list").
  - Deleted page: kind "Visit", named by its notes (or "Visit on <date>" without notes); restore needs its project not deleted ("Restore its project first").
- **Leak suite:** another partner's visit and a worker's non-crew visit are not found; a visit form posted with another partner's project id or a person not on the project is refused like a made-up id.

## Out of scope
- Photos on a visit (059), readings (061), offline (062–063).
- Free-text names of people who aren't users.
- A visit at another site than the project's.

## Acceptance criteria
- [x] Record a visit with date, people and notes; it shows on its page and in the project's Visits. ("I record a visit…")
- [x] Date required, not in the future; someone who was there required. ("A visit needs…")
- [x] Newest first. ("Visits are listed newest first")
- [x] The same form sent twice records one visit. ("Sending the same visit twice…")
- [x] Edit, delete and restore. ("I edit and delete my visit…")
- [x] Crew workers record; auditors read only; only the author and admins change a visit. ("A crew worker records…", "Only the visit's author…")
- [x] Another partner's visit stays hidden; tampered forms are refused. (last two scenarios)

## Approach (brief)
- Migration and DB tests first (`packages/db/src/site-visits.db.test.ts`): who sees, records, edits and deletes; idempotent insert; members follow the visit.
- `features/visits/visit-input.ts` (date, people, notes; unit tested), `queries.ts`, `actions.ts`, `visit-form.tsx` (client: makes the client id once per form), `visits-section.tsx` with a story.
- No new ADR.

## Test plan
- **Acceptance:** `site-visits.feature`.
- **New steps:** `the {string} field shows today's date`, `the {string} box is checked`, `I uncheck {string}`, `I fill in {string} with a date {int} days from now|ago`, `I open the new visit page of {string}` / `… of the project {string}`, `{string} has a visit {int} days ago with the notes {string}`, `the visits listed are {string}`, `I send the same visit form again`, `I open the visit {string} of {string}` / `… of the project {string}`, `the admin recorded a visit to {string} with the notes {string}`, `the {string} boxes are {string}`, `the auditor sees no {string} link`, `I post the delete form of the visit {string}`, `the admin sees the visit {string} on {string}`, `I open the address of the visit {string}`, `I see "Visit not found", the same as for a made-up visit address`, `I record a visit on {string} with the project id of {string}` / `… with the person id of {string}`, `the admin sees no visits on {string}`. Reuse existing ones where they exist.
- **Unit:** `visit-input.test.ts`.
- **DB:** `site-visits.db.test.ts`.
- **Storybook:** `VisitsSection` (visits, none, read-only).

## Progress log
- 2026-11-02 – Drafted with the feature file (in review; scenarios `@wip`).
- 2026-11-02 – Approved. Migration 0031 (`site_visit`, `site_visit_member`, `can_change_visit`, `delete_visit`, policies, a trigger keeping a visit's project and author); `features/visits/` (input, name, queries, actions, form, section with a story); visit pages; visits on the Deleted page. The heading step checks the heading's date (feature-file commit). The date field has no `max`: the browser would block a future date before the server's message. Red: DB (no tables), 9 of 9 e2e (no pages). Green: DB 93, unit (visits 7), `@task:058` 9.

- 2026-11-02 – Access review: no leak. Fixed three low findings: a clashing client id is refused unless it is the sender's own visit on that project (new leak-suite scenario); migration 0032 lets a visit list only the project's people (`is_project_person`) and changes nobody on a deleted visit. Full e2e: every file passes (load failures rerun with 1 worker; task-assignees is task 066).

## Parking lot
- Names of people at the visit who aren't users (customer staff).
- A visit's own site when it differs from the project's.
