# Task 061: Readings (online): fill a reading form on a visit

- **Status:** todo
- **Milestone:** M13 Sites & Field Data (POC lane: 057 → 060 → 061 → 064)
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`, `infra/scripts/rls-pins.mjs`
- **Feature file:** `docs/features/readings.feature`
- **Depends on:** task 060 (reading forms, versions and fields; not started). Task 058 (visits, `can_change_visit`, client ids) and task 056 (`can_work_on_project`) are done. ADR-0008 ("Field data": `form_submission`, `jsonb` values checked in code); design `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` ("Field data", "Roles").

## Why
Technicians record what they measure on site on the forms admins published, so every visit's readings are complete and comparable. The POC flow (task 069): "worker fills the reading on a project", then "admin sees … reading … on the project".

## Rules
- A **reading** is one filled form on one **visit** (design: `form_submission.visit_id`). It records the form **version** it was filled against, so it keeps its fields after the form is archived (or, later, replaced).
- **Which forms:** any **published** form of the project's workspace (design *my call*: a technician picks any published form). Drafts and archived forms aren't offered.
- **Values** are checked against the version's fields by a parser in code (ADR-0008), with the error on the field:
  - Number: a number ("Voltage must be a number"); shown with its unit ("230 V").
  - Text: free text. Yes/no: Yes or No. Choice: one of the options ("Choose Cable condition from the list"). Date: a calendar day (`"YYYY-MM-DD"`).
  - A required field left empty: "Voltage is required". An optional field left empty shows "Not filled in".
- **Who fills:** whoever can work on the project (`can_work_on_project`: admins, the partner's users, crew workers), as themselves, on a visit that isn't deleted. **Who sees:** whoever sees the visit (auditors read). A deleted visit hides its readings (as task 059's migration 0034 does for photos); restoring the visit brings them back.
- **Client ids (ADR-0008):** the form carries an id made in the browser; sending it twice records one reading (`insert … on conflict do nothing`, as for visits, with task 058's clash rule: a reused id that isn't the sender's own reading on that visit is refused). Task 063 reuses it.
- **No edit and no delete** in this task (open question 1): readings are append-only, like offline capture will be.

## Scope
- **Schema (next free migration after task 060's):**
  - `form_submission` (`id` from the client, `visit_id`, `version_id`, `values` `jsonb` keyed by field id, `submitted_by`, `recorded_at`, `submitted_at`, `deleted_at`, `deleted_by`; the delete columns are for task 063 and later, unused here).
  - **Access:** select follows the visit (the visit's own select rule: `can_see_project`, not deleted for those who don't see deleted visits); insert needs `can_work_on_project`, `submitted_by` = the user, a visit that isn't deleted and a **published** version of a form in the project's workspace (a definer helper, e.g. `is_published_version`). No update or delete policy. A trigger keeps the visit, version and author fixed.
  - **`infra/scripts/rls-pins.mjs`:** pin the new function(s), policies, trigger function and the table's owner and RLS flags (ARCHITECTURE, task 068); `pnpm test:infra` passes; `hardening.db.test.ts` keeps passing.
- **App (`apps/dashboard/features/readings/`):** `reading-values.ts` (parses the posted values against a version's fields; unit tested), `queries.ts`, `actions.ts`, the reading form (client: makes the client id once), the readings section (with a story).
  - **Visit page:** a "Readings" section (form name, who, link), with "Add a reading" for those who can work on the project; empty: "No readings yet."
  - **Project page:** a "Readings" section listing the readings of the project's visits (not deleted), newest first: form name, the visit's date, who; each a link. Empty: "No readings yet."
  - **Pages:**
    - `/projects/<id>/visits/<visitId>/readings/new`: heading "Add a reading"; the published forms as links (`?form=<form id>`); none: "No reading forms are published yet." With `?form=` naming a published form of the workspace: its fields as inputs (Number → number input with the unit, Text → text box, Yes/no → Yes/No radios, Choice → select, Date → date input) and "Save reading". An unknown, draft, archived or another workspace's `?form=` is ignored (the list again).
    - `/projects/<id>/visits/<visitId>/readings/<readingId>`: heading the form's name; the visit's date, who filled it, each field's label and value. Anything the user can't see, or made up: "Reading not found".
  - **Action:** create (posts the client id and the version id; refuses a version that isn't a published one of the workspace with "Choose a form from the list", and another partner's or a non-crew visit like a made-up id: "Something went wrong"), then the reading's page.
- **Leak suite:** another partner's reading address is not found like a made-up one; a deleted visit's reading too; a reading posted with another partner's visit id, or with a draft form's version, is refused.

## Out of scope
- Editing or deleting readings (open question 1); readings on the Deleted page.
- Offline readings (tasks 062–063); Photo fields (task 060 open question 1).
- Readings outside a visit, required forms per project, comparing readings across sites (design parking lot).
- The generated report (task 065).

## Acceptance criteria
- [ ] Fill a published form on a visit; the reading shows on its page, on the visit and on the project. ("I fill in a reading on a visit")
- [ ] A required field left empty is refused with the error on the field, and the values entered stay. ("A reading's values are checked against its form"; number, choice and date checks, which a browser input can't send wrong, are unit tests of `reading-values.ts`)
- [ ] Only published forms are offered; a reading keeps its fields after its form is archived. ("Only published forms are offered, and readings outlive their form")
- [ ] The same form sent twice records one reading. ("Sending the same reading twice records it once")
- [ ] Crew workers fill readings; auditors read them and get no "Add a reading". ("A crew worker fills a reading; the auditor reads it")
- [ ] Another partner's reading and a deleted visit's reading are not found. ("Another partner's readings stay hidden, and so do a deleted visit's")
- [ ] A reading posted for another partner's visit, or with a draft form, is refused. ("My reading forms are refused for another partner's visit and for a draft form")

## Approach (brief)
- Migration and DB tests first (`packages/db/src/readings.db.test.ts`): who reads and writes, published versions only, deleted visits hide readings, idempotent insert and the clash rule.
- Unit: `reading-values.test.ts` (each type, required, unknown field ids ignored, unit display).
- No new ADR.

## Test plan
- **Acceptance:** `readings.feature`.
- **New steps (likely):** `I have a published reading form {string} with the fields:` (a data table: label, type, unit, required, options; through `@repo/db/maintenance`), `I open the {string} reading form on the visit {string}`, `I choose {string} for {string}` (radio), `the readings listed are {string}` (the "Readings" region of the project page), `the forms offered are {string}`, `I filled in the reading {string} on the visit {string} with {string} as {string}`, `the form {string} is archived`, `I send the same reading form again`, `the admin filled in the reading {string} on the visit {string}`, `the auditor opens the visit {string} of the project {string}`, `I open the address of the reading on the visit {string}`, `I add the reading {string} on the visit {string} with the visit id of {string}` / `… with the form {string}`, `the admin sees no readings on {string}`. From task 060: `I have a draft|published reading form {string} with the field {string}`, `the admin published the reading form …`, `the admin has a draft reading form …`. Reuse the visit and leak-suite steps (`{string} has a visit {int} days ago with the notes {string}`, `the admin recorded a visit to …`, `the visit {string} is deleted`, `I am on the crew of …`).
- **Unit:** `reading-values.test.ts`.
- **DB:** `readings.db.test.ts`.
- **Storybook:** the readings section (readings, none, read-only) and the reading form (each type, errors).
- **Previews (task 069):** the scenarios' forms come from database fixtures; the `@poc` flow publishes its form through task 060's pages and fills it through this task's pages, so it needs no database step.

## Open questions (for the owner)
1. **Can readings be edited or deleted after saving?** *Recommended:* not for the POC (append-only, as offline capture will be). After it, the author and admins delete a reading (soft, restored from the Deleted page, as for visits) and fill it again; editing waits, since offline edits need conflict rules (design parking lot). The task assumes "neither"; not blocking.

## Progress log
- 2026-11-05 – Drafted with the feature file (scenarios `@wip`).

## Parking lot
- Delete and restore a reading; edit a reading online.
- Show a reading's form version ("version 2") once forms get new versions (task 060 parking lot).
- Readings outside a visit; a "Readings" filter by form on the project.
- Comparing readings across sites and over time (charts, exports).
- 2026-11-05 – Owner confirmed the recommended answer: readings are append-only for the POC (delete after it, editing later).
