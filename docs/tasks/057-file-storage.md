# Task 057: File storage foundation

- **Status:** todo (in review)
- **Milestone:** M13 Sites & Field Data
- **Zone / package:** new `packages/storage` (`@repo/storage`), `docker-compose.yml`, `.env.example`, `.github/workflows/ci.yml`
- **Feature file:** none. Nothing a user sees changes; task 059 (photos and files) adds `attachments.feature` and the first screens. This task is tested by the package's tests against a real local storage server.
- **Depends on:** ADR-0008 ("Files"); design `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` ("File storage")

## Why
Photos, files and reports need a home that isn't Postgres, reachable from phones without the bytes passing through Cloud Run. Tasks 059 and 065 build on this.

## Scope
- **`@repo/storage`**, server-only, backed by Google Cloud Storage (`@google-cloud/storage`):
  - `createUploadUrl({ key, contentType, expiresInSeconds? })`: a V4 signed `PUT` URL bound to that content type, valid 15 minutes by default (*my call*).
  - `createDownloadUrl({ key, fileName?, expiresInSeconds? })`: a V4 signed `GET` URL, valid 5 minutes by default (*my call*), with `Content-Disposition` naming the file when `fileName` is given.
  - `stat(key)`: size and content type of an uploaded object, or null. Signed `PUT` URLs can't limit size, so callers check an upload with `stat` and delete what's too big or of the wrong type (limits wait on open question 3).
  - `remove(key)`: deletes an object; a missing object is not an error.
  - `objectKey(parts)`: builds keys as `<workspace>/<project>/<uuid>`, never from file names (*my call*), so a key says nothing a URL shouldn't.
  - Config from env: `STORAGE_BUCKET`, and locally `STORAGE_EMULATOR_HOST` (the fake server). Deployed, credentials come from the Cloud Run service account (signing through IAM); no keys in the repo.
  - The package never checks access: callers do, before asking for a URL (task 059).
- **Local backend:** `fake-gcs-server` in `docker-compose.yml` next to Postgres, started by `pnpm db:up`, with the dev bucket created on start and CORS open to the local zones, so browsers upload straight to it.
- **CI:** the e2e job runs `fake-gcs-server` as a service, and runs the storage tests.
- **Docs:** ARCHITECTURE (package boundaries: `@repo/storage` is server-only, imported by apps, never by the browser), `.env.example`, CLAUDE.md Commands (`pnpm --filter @repo/storage test:storage`).

## Out of scope
- The real bucket, its IAM and lifecycle rules: Terraform in task 068 (M11), which already plans the bucket.
- Any table, page or access rule for files (task 059).
- Shrinking photos in the browser, file limits and retention (open question 3; parking lot).

## Acceptance criteria
- [ ] A file uploaded with a URL from `createUploadUrl` can be read back with a URL from `createDownloadUrl`, against the local server.
- [ ] An upload with another content type than the URL was signed for is refused.
- [ ] `stat` reports the uploaded size and type, and null for a missing key; `remove` deletes, and removing a missing key succeeds.
- [ ] Download URLs carry the file name when given.
- [ ] Expired URLs are refused (a URL signed for 1 second, used after it expires).
- [ ] The storage tests run in CI.

## Approach (brief)
- Test first: `packages/storage/src/storage.storage.test.ts` (against the fake server, like the DB tests) and unit tests for `objectKey` and config parsing.
- Whether `fake-gcs-server` enforces signatures and expiry needs checking in the red run. If it doesn't, those two criteria are tested on the signed URL's parameters (`X-Goog-Expires`, `X-Goog-SignedHeaders`) instead, and that is noted here.
- No new ADR: ADR-0008 covers object storage and signed URLs.

## Test plan
- **Storage tests** (local server): the acceptance criteria above.
- **Unit:** `objectKey`, config (missing bucket fails clearly; emulator host switches the endpoint).

## Progress log
- 2026-11-02 – Drafted.

## Parking lot
- Purging deleted files after a retention period (design parking lot).
- Resumable uploads for very large files.
