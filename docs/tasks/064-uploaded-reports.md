# Task 064: Uploaded reports on a project

- **Status:** in-progress
- **Milestone:** M13 Sites & Field Data (POC lane: 057 → 060 → 061 → 064)
- **Zone / package:** `apps/dashboard`, `e2e` (`packages/db` and `infra/scripts/rls-pins.mjs` only if a migration turns out to be needed, see Scope)
- **Feature file:** `docs/features/reports.feature`
- **Depends on:** task 057 (`@repo/storage`) and task 059 (the `attachment` table, signed uploads, `/attachments/<id>`, `delete_attachment`), both done. Not on tasks 060 or 061: this task can run in parallel with them. ADR-0008 ("Field data": `attachment.kind` `photo | file | report`; "Files"); design `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` ("Reports", "Roles", open question 3).

## Why
The finished report (often written outside the app) belongs with the project, where the customer's people and the team find it (owner decision 10: uploaded reports; the generated one is task 065). The POC flow (task 069): "admin uploads a report", then "sees … report on the project".

## Rules
- A **report** is an attachment of kind `report` on a **project** (not on a visit, *my call*; parked). Task 059 left room for it: the `attachment_kind_check` already allows `report` (migration 0033).
- **Who uploads (design's Roles table: "record and upload"):** whoever can work on the project (`can_work_on_project`: admins, the partner's users, crew workers). **Who sees:** whoever sees the project (auditors read; the partner's users see their own projects' reports). **Who deletes:** the uploader and admins (task 059's rule). Delete is soft; admins restore from the Deleted page.
- **Limits (*my call* until open question 3, see Open questions):** the same types and size as task 059's files (PDF, Word, Excel, CSV, plain text or images, up to 50 MB), with report messages: "Reports must be PDF, Word, Excel, CSV, text or images" and "Reports can be up to 50 MB". Checked before signing and again on the stored object, as in task 059.
- **Bytes never pass through the app** (task 059): signed upload, then confirm; every download goes through `/attachments/<id>`, as an attachment with its file name.

## Scope
- **No migration expected:** the kind check, policies, trigger and `delete_attachment` already cover any kind. If the work shows a database change is needed (for example, refusing a report with a `visit_id`), it is a new migration, it updates `infra/scripts/rls-pins.mjs` in the same PR (ARCHITECTURE, task 068) and `pnpm test:infra` passes; otherwise the code refuses a report on a visit.
- **App:**
  - `features/attachments/attachment-limits.ts`: `ATTACHMENT_KINDS` gains `report`, with its limits and messages (unit tested).
  - `startUploadAction` accepts `report` only without a visit; the route handler serves a report as a download with its name (as files).
  - **Project page: a "Reports" section** (a region named "Reports"): each report's file name (a link to `/attachments/<id>`), size, who uploaded it and when, newest first; "Upload a report" for those who can work on the project; "Delete <file name>" for the uploader and admins; empty: "No reports yet."
  - The **"Photos and files"** section (project and visit pages) no longer lists reports: it keeps `photo` and `file` only.
  - **Deleted page:** a deleted report is listed as kind "Report", named by its file name; restore needs its project not deleted ("Restore its project first", as today).
- **Leak suite:** another partner's report address is a 404 like a made-up one; an upload of a report started with another partner's project id is refused like a made-up id; a worker's non-crew project's report is a 404.

## Out of scope
- The generated PDF report (task 065).
- Reports on a visit, a report's title, date or the visits it covers, versions of a report.
- Shrinking or previewing files; purging deleted uploads (task 059 parking lot).
- Offline uploads (task 063).

## Acceptance criteria
- [ ] Upload a report on a project; it shows in Reports (not in Photos and files) and downloads under its name. ("I upload a report and download it from the project")
- [ ] A wrong type or a file over 50 MB is refused, with nothing left behind. ("A report must be a document, up to 50 MB")
- [ ] Delete and restore. ("I delete my report, and an admin restores it")
- [ ] Crew workers upload; auditors read without buttons; only the uploader and admins delete; the project's partner users see it. ("A crew worker uploads a report; the auditor and the partner see it")
- [ ] Another partner's report address is not found; a tampered upload is refused; a worker doesn't see a non-crew project's report. ("Another partner's report stays hidden, its address included", "A worker doesn't see the report of a project they're not on", "My report uploads are refused for another partner's project")

## Approach (brief)
- Unit tests first: `attachment-limits.test.ts` (the `report` kind, its types, sizes and messages).
- DB: extend `attachments.db.test.ts` with a `report` row (who sees, uploads, deletes) only if a migration is added; otherwise the existing tests cover the policies, which don't look at the kind.
- Reuse the uploader component and `AttachmentsSection` patterns; a `ReportsSection` with a story.
- No new ADR.

## Test plan
- **Acceptance:** `reports.feature`.
- **New steps (likely):** `the admin uploaded the report {string} to {string}` (stored for real and confirmed, like `the admin added the photo …`), `the reports listed are {string}` (the "Reports" region), `the report {string} downloads as {string}` (task 059's download check on the "Reports" region), `I open the address of the report {string}`, `I start a report upload on {string} with the project id of {string}`, `the admin sees no reports on {string}`, `the {string} user opens the {string} project page` / `the {string} user sees the text {string}` (the partner's user in the leak workspace). Reuse task 059's `I add the file {string} with {string}` (unknown extensions upload as `application/octet-stream`), `I add a {int} MB file {string} with {string}`, `the auditor sees no {string} button and no {string} button`, `it is not found, the same as a made-up photo address`, `the upload is refused, the same as with a made-up id`, `the {string} section shows|does not show {string}`.
- **Unit:** `attachment-limits.test.ts`.
- **Storybook:** `ReportsSection` (reports, none, read-only).
- **Previews (task 069):** the main scenario uploads through the page; only the fixtures and the tampered-upload checks touch the database or storage directly.

## Open questions (for the owner)
1. **Report file types and size.** *Recommended:* for the POC, the same as files (PDF, Word, Excel, CSV, text or images, up to 50 MB); narrow to PDF (and Word) when open question 3 is answered. The task assumes the files' limits; not blocking.
2. **Who uploads reports** (confirming the design). The design's Roles table lets workers and partner users "record and upload" reports in their projects, as for photos; the POC flow needs only admins. *Recommended:* keep the design (whoever can work on the project). The task assumes this; not blocking.

## Progress log
- 2026-11-05 – Drafted with the feature file (scenarios `@wip`).
- 2026-11-05 – Owner confirmed the recommended answers: task 059's file types and 50 MB limit; whoever can work on the project uploads reports, the uploader and admins delete.
- 2026-11-05 – Started in lane 2 (`feat/uploaded-reports`).
- 2026-11-05 – Red: `@wip` removed, steps in `e2e/steps/reports.steps.ts` (helpers shared from `attachments.steps.ts`, `signUp` returns the account). 5 scenarios fail on the missing "Upload a report" input / "Reports" region; the two hidden-address scenarios already pass (the route and policies don't look at the kind), kept as regression guards.
- 2026-11-05 – Green: `report` in `ATTACHMENT_KINDS` (files' types, 50 MB, report messages, `uploadLabel`), `startUploadAction` refuses a report with a visit, `listProjectReports` + `ReportsSection` (story: reports, empty, read-only) with `AttachmentUploader kinds`, Photos and files lists `photo`/`file` only, Deleted page kind `report` ("Report"). No migration. `@task:064` 7/7, `@task:059` 9/9; full e2e 275/291 with 16 timeouts under load (lane 1 concurrent), all 43 scenarios of those files pass alone; unit 347 (dashboard), lint and typecheck green.
- 2026-11-05 – Access audit: no leaks; six leak-suite scenarios added to `reports.feature` (`@task:064`, no `@wip`): a worker's or partner's delete posted by id, the auditor's direct upload, a report on a visit, a worker off the crew, a deleted report's address and restore.
- 2026-11-05 – Review fixes: the first round's unit tests (`attachment-limits`, `deleted-kind`) were run red but landed in the same commit as the code, not as a separate red commit (review finding). Now: `GALLERY_KINDS` / `REPORT_KIND` replace the kind strings in the attachment and Deleted queries and restore; `allowedOnVisit(kind)` (unit tested, red first) holds "a report can't be on a visit"; `formatSize` unit test; the `ReportsSection` story shows a stand-in "Upload a report" button. Unit 352 (dashboard), lint and typecheck green; e2e not rerun cleanly, as another session was running Playwright in this lane at the same time.

## Parking lot
- Reports on a visit; a report title, date and the visits it covers.
- PDF-only reports (open question 3).
- A Reports column or filter on the projects table.
