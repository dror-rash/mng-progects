# Task 060: Reading forms (templates), built and published by admins

- **Status:** done (PR #48)
- **Milestone:** M13 Sites & Field Data (POC lane: 057 → 060 → 061 → 064)
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`, `infra/scripts/rls-pins.mjs`
- **Feature file:** `docs/features/form-templates.feature`
- **Depends on:** nothing open. Task 056 (roles, `access_role` with `worker`) is done; task 057 isn't needed (no files here). ADR-0008 ("Field data": `form_template` → `form_template_version` → `form_field`); design `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` ("Form templates", "Roles", open question 2). Task 061 (readings) depends on this task.

## Why
Technicians record measurements on forms that admins define (owner decision 9). The POC flow (task 069) starts the field-data part with "admin publishes a reading form"; task 061 fills it in.

## Rules
- A **reading form** belongs to a workspace. It has a name, an optional description and a status: **Draft**, **Published** or **Archived** (a `const` list with labels, like `task-status.ts`).
- **Fields** (in the order they were added): a label, a type, Required or not, a unit (number fields only) and options (choice fields only, at least two).
- **Field types** (design, open question 2; *my call* to leave Photo out for the POC, see Open questions): **Number**, **Text**, **Yes/no**, **Choice**, **Date**. A `const` list with labels and `parse…`, defined once.
- **Versions (ADR-0008):** a form has versions; a version is **immutable once published** (fields included), so readings (task 061) always match the fields they were filled against. In this task a form has one version: version 1 is the draft, and publishing freezes it. Changing a published form (a new version) is parked; until then an admin archives it and builds a new one.
- **Lifecycle:** Draft → Published (needs at least one field) → Archived. No going back in this task.
- **Who (design's Roles table):**
  - **Admins** create forms, add and remove fields on a draft, publish and archive.
  - **Auditors** see every form (drafts too) and change nothing.
  - **Workers and partner users** read published (and archived) forms only through the database, for filling readings (task 061). The Reading forms pages are not found for them (*my call*, like Customers).
  - Another workspace's forms: nothing, for anyone.
- **Removing a field from a draft** deletes the field row (*my call*): a draft is unpublished editing that no one else fills in, so rule 8's soft delete doesn't apply to it. Forms themselves are never deleted in this task (archive instead).

## Scope
- **Schema (next free migration, 0037 at the time of writing):**
  - `form_template` (`id`, `workspace_id`, `name`, `description`, `status` `draft | published | archived` with a check, `created_by`, `created_at`, `updated_at`).
  - `form_template_version` (`id`, `template_id`, `version` int, `published_at` null until published; unique on template and version).
  - `form_field` (`id`, `version_id`, `label`, `type` with a check, `required` bool, `unit` nullable, `options` `text[]` nullable, `position` int).
  - **Access functions** (`SECURITY DEFINER`, `SET search_path = public, pg_temp`, `EXECUTE` for `app_user` only): `can_see_form_template` (members of its workspace who are admins or auditors: every form; other members: published and archived ones), `can_change_form_template` (admins of its workspace).
  - **Policies** on all three tables: select with `can_see_form_template` (versions and fields follow their form; a worker or partner sees only published versions); insert and update of forms with `can_change_form_template`; insert, update and delete of versions and fields only by admins and only while the version is unpublished. A trigger refuses any change to a published version or its fields (the owner bypasses RLS, not the trigger) and keeps a form's workspace and a field's version fixed.
  - **`infra/scripts/rls-pins.mjs`:** pin the new functions, policies, trigger function and the three tables' owner and RLS flags (ARCHITECTURE, task 068); `pnpm test:infra` passes. `hardening.db.test.ts` keeps passing (RLS on every new table, no definer function executable by `PUBLIC`).
- **App (`apps/dashboard/features/reading-forms/`):** not `features/forms/`, which holds the HTML form helpers (`form-state.ts`).
  - `field-type.ts` and `form-status.ts` (`const` lists, labels, `parse…`, defaults), `field-input.ts` (parses the add-field form; unit tested), `queries.ts`, `actions.ts`.
  - **Pages**, admins and auditors only (`requireWorkspace`; others get "Form not found" / "This page could not be found."):
    - `/forms`: heading "Reading forms"; a table named "Reading forms" of the workspace's forms (the name as the row header and a link, status, field count), newest first; "New form" for admins; empty state "No reading forms yet."
    - `/forms/new`: Name (required: "Form name is required"), Description; "Create form" → the form's page.
    - `/forms/<id>`: heading the form's name, its status, description and fields (label, type, unit, Required). On a draft, admins get an "Add a field" form (Label, Type, Unit, Options one per line, Required; "Add field"), "Remove <label>" per field and "Publish"; on a published form, "Archive". A made-up id, another workspace's form or one I can't see: "Form not found".
  - **Errors:** "Field label is required"; "Add at least two options, one per line" (choice); "Add a field before publishing"; any change posted to a form that is no longer a draft (another tab, a tampered form): "A published form can't change".
  - **Where admins find it:** a "Reading forms" link on the Workspace settings page, next to "Members and invites" (design: "Settings → Forms"). The dashboard menu stays as task 070 set it.
  - Actions post the hidden `workspaceId` (`requireWorkspaceForAction`) and check `isAdmin`; refusals look like a missing form.
- **Leak suite:** workers and partner users get not found on `/forms` and on a form's address; another workspace's form address is not found like a made-up one; a partner user posting the add-field or publish form is refused like a made-up id.

## Out of scope
- Filling forms (task 061); offline forms in the field pack (task 062).
- A Photo field type (open question 1), min/max on numbers, signatures, pass/fail per item (design open question 2).
- New versions of a published form, renaming a form, reordering or editing fields, un-archiving, deleting forms.
- Required forms per project or site (design parking lot).

## Acceptance criteria
- [x] An admin creates a form, adds Number (with unit), Yes/no and Choice fields, removes one, publishes it; it shows as Published in the list and its fields can no longer change. ("I build and publish a reading form")
- [x] A form needs a name; a field needs a label; a choice needs two options; publishing needs a field. ("A form and its fields are checked")
- [x] A published form can't change, even from a stale or tampered form. ("A published form can't change")
- [x] An admin archives a published form; it shows as Archived. ("I archive a published form")
- [x] Auditors see forms without buttons; workers get not found on the pages. ("Auditors read forms; workers don't see the pages")
- [x] Another workspace's form is not found, like a made-up one. ("Another workspace's form stays hidden")
- [x] A partner user gets not found on a form's address, and their posted form changes are refused like a made-up id. ("Form changes from someone who isn't an admin are refused")

## Approach (brief)
- Migration and DB tests first (`packages/db/src/form-templates.db.test.ts`): who sees drafts and published forms, admin-only writes, the published-version trigger, other workspaces see nothing.
- Unit: `field-input.test.ts` (types, unit only on numbers, options), `field-type.test.ts`, `form-status.test.ts`.
- 069 can publish its form with this task's app-only steps (scenario 1 builds the form through the pages), so the `@poc` flow can run on a preview.
- No new ADR: ADR-0008 covers the model.

## Test plan
- **Acceptance:** `form-templates.feature`.
- **New steps (likely):** `I add the field {string} of type {string}` (with unit / options / required variants, or a data table), `I fill in {string} with the lines {string}`, `the fields listed are {string}` (the "Fields" region), `I have a published reading form {string} with the field {string}`, `I open the form {string}`, `I open the address of the form {string}` (sets the replay for the made-up-id check), `another user has a reading form {string}`, `the admin published the reading form {string} with the field {string}`, `the admin has a draft reading form {string} with the field {string}`, `the auditor opens the form {string}`, `I post the add-field form of the form {string} with the label {string}`, `I post the remove form of the field {string} of the form {string}`, `I post the publish form of the form {string}`, `the admin sees the draft form {string} with the fields {string}`. Reuse `I fill in`, `I select … from …`, `I check`, `I press`, `the {string} row shows {string}`, `the {string} section shows {string}`, `I see {string}, the same as with a made-up id`, `the auditor opens {string}`, `the auditor sees no {string} button|link`.
- **Unit:** see Approach.
- **DB:** `form-templates.db.test.ts`.
- **Storybook:** the form page's field list (draft with remove buttons, published, read-only) and the add-field form (errors).

## Open questions (for the owner)
1. **Field types for the POC.** The design allows six (Number, Text, Yes/no, Choice, Date, Photo). *Recommended:* the first five now; Photo fields after the POC (photos already go on the visit, task 059). The task assumes this; not blocking.
2. **Changing a published form.** *Recommended:* after the POC, "Edit" makes a new draft version that replaces the published one when published (readings keep their version). Until then: archive and build a new form. The task assumes this; not blocking.

## Progress log
- 2026-11-05 – Drafted with the feature file (scenarios `@wip`).
- 2026-11-05 – Owner confirmed the recommended answers: five field types (Photo after the POC); a published form is archived and rebuilt rather than edited until after the POC.
- 2026-11-05 – Started in lane 1 (`feat/form-templates`).
- 2026-11-05 – Red: `@wip` removed, steps in `e2e/steps/form-templates.steps.ts` (forms built through the pages only; tampered posts copy the target form's hidden fields onto a "Decoy" draft in a workspace of my own, so the form id must be a hidden input, not a bound argument; field labels are the row headers of a table in the "Fields" region). All 7 scenarios fail on the missing pages (no "Reading forms" link; `/dashboard/forms/new` 404). "the auditor sees no {string} button" now waits for any page heading, not the Deleted items table.
- 2026-11-05 – Green in lane 1. Migration 0037 (tables, `can_see`/`can_change_form_template`, plus `can_see`/`can_change_form_version` so the version and field policies stay one call each; policies; triggers `form_template_check`, `form_template_version_check`, `form_field_check`), `form-templates.db.test.ts`, RLS pins. App in `features/reading-forms/` and `/forms` pages; "Reading forms" link on Workspace settings for admins and auditors. Archiving a draft (only by a tampered post) answers "Only a published form can be archived". The add-field form clears only the fields still holding what it sent (`features/forms/keep-new-input.ts`): the scenario types the next label as soon as the POST answers, before React's form reset, which wiped it.
- 2026-11-05 – Access audit: three leak scenarios added to the feature file (no `@wip`): "Reading forms pages are not found for <who>, drafts included" (workers and partner users: `/forms`, `/forms/new`, a published and a draft form's address), "Form changes posted by <who> are refused" (workers and auditors: add field, remove field, publish), "An admin of another workspace can't change a form by posting its id from their own workspace". New steps: `I am signed in as an auditor` and the three `… from my own workspace` posts (the decoy's own `workspaceId`, only the form id swapped).
- 2026-11-05 – Review note: the unit tests (`field-type`, `form-status`, `field-input`, `scope`, the Fields section, the add-field form, `keep-new-input`) and `form-templates.db.test.ts` were each run red before their code, but they landed in the same commits as that code (`8714aba`, `bc1df96`), with no separate red commit.
- 2026-11-05 – Review and access-audit fixes (0037 amended: unmerged and applied only to `app_lane1`, which was dropped and re-migrated). Red first each time:
  - **Item 2, publishing:** with the fixtures publishing forms by their status alone, the DB tests failed 7. Workers saw no published fields because the version stayed unpublished, so the frozen-version checks failed too; a draft's version could be published; a form could be inserted as published, or published with no fields. Now `form_template_check` refuses an insert past draft and draft → published without a field on the latest version. The new `form_template_publish` (AFTER trigger) publishes that version. `form_template_version_check` refuses a version inserted published, or published while its form isn't. The publish action sets only the form's status. Red for the app: "I archive a published form" timed out on the refused version update.
  - **Item 1, leak:** an outsider inserting a field into another workspace's published version got 23514 ("a published form version can't change") where a draft or made-up id got 42501. `form_field_check` now leaves a runtime user who can't change the version to RLS before reading or locking it, so all three get 42501.
  - **Pins and nits:** RLS pins updated. `removeFieldAction` throws Not found when no row was deleted. Status writes use `satisfies FormStatus`. The `StaleRemove` story presses "Remove Voltage" and expects the alert. `keep-new-input` moved to `features/reading-forms/` (CLAUDE.md's Forms rules unchanged); retyping the exact value just sent clears it.
- 2026-11-05 – QA PASS: `@task:060` 12/12, full e2e 292/296 with the 4 timeouts passing alone; unit (dashboard 373), DB 136, `test:infra`, lint, typecheck, build and Storybook build pass. `NewReadingFormForm` and `FormActionButton` have no stories of their own: they call server actions, as `site-form` and `visit-form` do. In review.
- 2026-11-05 – Merged (PR #48); its main deploy passed. On its preview, migration 0037 and the runtime role check passed on Cloud SQL; the one failing `@smoke` scenario was task 075's connection limit.

## Parking lot
- Photo, signature and pass/fail field types; min/max on numbers.
- New versions of a published form; rename; reorder and edit fields; un-archive; copy a form.
- A "Forms" menu entry for admins (task 070 kept the menu to three items).
- Required forms per project or per site.
- Other forms that stay on the page after a successful submit (add contact, add task, add note) have the same reset race as add-field had; `keep-new-input.ts` could serve them too.
