# Task 059: Photos and files on a project or visit

- **Status:** in-progress
- **Milestone:** M13 Sites & Field Data (POC lane: 056 → 058 → 059)
- **Zone / package:** `packages/db`, `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/attachments.feature`
- **Depends on:** task 057 (`@repo/storage`), task 058 (visits); ADR-0008 ("Files"); design ("Field data", "File storage", "Roles")

## Why
Photos of what was found and documents from the site (plans, certificates, delivery notes) belong with the project and the visit they came from.

## Rules
- An attachment belongs to a project and, optionally, one of its visits. Kinds: `photo` and `file` (`report` comes with task 064).
- **Who adds:** whoever can work on the project (admins, the partner's users, crew workers). **Who sees:** whoever sees the project (auditors read). **Who deletes:** the uploader, and admins (*my call*, as for visits). Delete is soft; admins restore from the Deleted page; the stored object stays (purging is parked).
- **Limits (*my call* until open question 3 is answered):**
  - Photos: JPEG, PNG, WebP or HEIC, up to 20 MB each.
  - Files: PDF, Word, Excel, CSV, plain text or images, up to 50 MB each.
  - The server checks type and size before signing an upload and again after it (the object's real size and type in storage), and deletes what doesn't fit.
- **Bytes never pass through the app:** the browser asks for a signed upload URL, sends the file straight to storage, then confirms. Every view or download goes through `/attachments/<id>` (a route handler that checks access, then redirects to a 5-minute signed URL), so pages never carry long-lived links.
- **Phones:** "Add photos" opens the camera or the photo library (`accept="image/*" capture="environment"`), several at a time.

## Scope
- **Schema (migration 0033):** `attachment` (`id` made by the browser, `workspace_id`, `project_id`, nullable `visit_id` of the same project, `kind`, `storage_key`, `file_name`, `content_type`, `size_bytes`, `uploaded_by`, `created_at`, `confirmed_at` (null until the upload is checked), `recorded_at`, `deleted_at`, `deleted_by`).
  - Access as for visits: select follows `can_see_project` (unconfirmed uploads only for their uploader; deleted ones for admins and auditors); insert by whoever can work on the project, as themselves; confirm by the uploader; soft delete through `delete_attachment` (uploader or admin).
- **App:**
  - `features/attachments/`: limits (unit tested), `startUploadAction` (checks access, kind, type and size; inserts the unconfirmed row; returns the signed URL), `finishUploadAction` (the uploader's own unconfirmed row only; `stat` checks size and type; confirms, or deletes the object and the row), `deleteAttachmentAction`, queries, the upload button (client: one file after another, a progress line, errors under the button), the gallery section (photos as thumbnails, files as a list with name and size; the visit date when it came from a visit).
  - Route handler `app/attachments/[attachmentId]/route.ts`: 404 for anything the user can't see (unknown, another partner's, unconfirmed, deleted), otherwise a redirect to a signed download URL (photos inline, files as an attachment with their name).
  - Project page and visit page: a "Photos and files" section with "Add photos" and "Add files" for those who can work on the project.
  - Deleted page: kind "Photo or file", named by its file name; restore needs its project (and visit) not deleted.
- **Leak suite:** another partner's photo address is a 404 like a made-up one; an upload started with another partner's project id, or finished with another upload's id, is refused like a made-up id.

## Out of scope
- Shrinking large photos in the browser (the design's *my call*): parked until open question 3 sets the limits; 20 MB covers phone photos.
- Captions, renaming, moving between visits.
- Uploaded reports (064), offline photos (063).
- Purging deleted or abandoned (never confirmed) uploads from storage.

## Acceptance criteria
- [ ] Add a photo and open it; add a file and download it under its name. (first two scenarios)
- [ ] Wrong type and too big are refused, with nothing left behind. ("A photo must be an image…")
- [ ] Photos on a visit show there and in the project's gallery. ("Photos of a visit…")
- [ ] Delete and restore. ("I delete my photo…")
- [ ] Crew workers add; auditors read; only the uploader and admins delete. ("A crew worker adds photos…")
- [ ] Another partner's photo address is not found; tampered uploads are refused. (last two scenarios)

## Approach (brief)
- Migration and DB tests first (`packages/db/src/attachments.db.test.ts`).
- Unit: `attachment-limits.test.ts` (kinds, types, sizes, messages).
- E2e uploads real files (small fixtures made in the steps) to the local storage server; the 60 MB case is refused before any upload.
- No new ADR: ADR-0008 covers files and signed URLs.

## Test plan
- **Acceptance:** `attachments.feature`.
- **New steps:** adding a photo or file with a button, a sized file, "shows the photo/file", "opens as an image", "downloads as", the admin adding a photo (straight to storage and the database), "the address of the photo", "not found, the same as a made-up photo address", starting and finishing tampered uploads, "the admin sees only … on …", "the auditor sees no … button and no … button" (exists).
- **Unit:** `attachment-limits.test.ts`.
- **DB:** `attachments.db.test.ts`.
- **Storybook:** `AttachmentsSection` (photos and files, empty, read-only).

## Progress log
- 2026-11-02 – Drafted with the feature file (in review; scenarios `@wip`).
- 2026-11-02 – Approved. Migration 0033 (`attachment`, its trigger, `can_change_attachment`, `delete_attachment`, policies); `features/attachments/` (limits, actions, queries, uploader, section with a story); the `/attachments/<id>` route; sections on the project and visit pages; the Deleted page. Red: DB (no table), 8 of 8 e2e (no buttons, gallery or route). Green: DB 103, unit 298 (dashboard), `@task:059` 8. Playwright passes files over 50 MB only from disk, so that step writes one.

## Parking lot
- Shrink photos in the browser (open question 3).
- Purge deleted and abandoned uploads from storage after a retention period.
- Captions on photos.
