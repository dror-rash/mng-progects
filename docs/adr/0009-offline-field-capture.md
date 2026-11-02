# ADR-0009: Offline field capture with an outbox and idempotent sync

- **Status:** accepted
- **Date:** 2026-11-02
- **Design:** `docs/superpowers/specs/2026-11-02-sites-and-field-data-design.md` (section "Offline capture and sync")
- **Builds on:** ADR-0008 (field data tables with client-generated ids)

## Context
Technicians often work at sites with no signal. They must be able to open a project's forms, fill in readings, take photos and record a visit offline. The data has to reach the server once service returns, and **nothing recorded on the device may be lost**. The app is a Next.js App Router app built on server components and server actions, and both need the network. Technicians use ordinary phones, including iPhones, where Safari has no Background Sync and may evict a website's storage.

## Decision
- **An installable web app (PWA):** a web app manifest and a service worker that caches the app shell and the field view's code.
- **The field view is a client island**: an exception to "server components by default", limited to this view. It reads from IndexedDB, not from server components.
- **Field pack:** while online, the device downloads each of the technician's projects into IndexedDB through JSON route handlers that check access. The pack holds the project, site and contacts, open tasks, and published form versions. It refreshes on every online visit and shows when it was last updated.
- **Outbox:** every offline write (a visit, a reading, a photo blob, a task status change) goes first into an IndexedDB outbox. Each item is keyed by its client-generated UUID and records the device time and the user it belongs to.
  - The UI shows outbox items right away, marked "Not synced yet".
  - An item leaves the outbox **only after the server confirms it**.
- **Sync:** the app syncs on the `online` event, when it opens, and on a timer while items wait. It doesn't depend on Background Sync.
  - Each item goes to an idempotent route handler that runs inside `withAccess`. Sending the same id twice records the item once and returns the same result.
  - Photos upload to storage through a signed URL first, then their metadata.
- **Conflicts:** offline work only appends records, so it doesn't conflict. The one exception is a task's status, where the latest change by device time wins and both changes stay in the history. Editing existing records needs a connection.
- **Refusals:** an item the server refuses (access removed, project deleted, form invalid) stays on the device, marked "Couldn't sync" with the reason, and can be exported (JSON plus photos). Nothing is dropped automatically.
- **Safeguards:**
  - The app asks for `navigator.storage.persist()`, warns when the device is low on space, and shows how many items are waiting to sync.
  - Outboxes are per user. An expired login pauses sync without dropping anything, and another user on the device can't see or send someone else's items.

## Alternatives considered
- **A native app (React Native or Capacitor).** Its storage is more reliable and it has background sync, but it's a second codebase with app store releases and a new toolchain. It is kept as the fallback if browser storage proves unreliable on technicians' devices.
- **A sync engine or local-first database (e.g. PowerSync, ElectricSQL, Replicache).** Full two-way sync, but it adds a service and its own replication protocol to keep in step with our row-level security rules. Our offline needs are append-only plus one field, which an outbox covers.
- **Background Sync API only.** Not available in Safari on iOS, so it can't be the only trigger.
- **Server actions queued for replay.** They are tied to the build's action ids, which change on deploy, so a queued action could fail after a release. Plain route handlers with a stable payload survive deploys.
- **Last-write-wins editing of any record offline.** It silently overwrites other people's changes. Limiting offline work to creating records avoids that.

## Consequences
- **Good:**
  - Technicians can work with no signal.
  - Retries are safe because of client ids and idempotent handlers.
  - Nothing is removed from the device before the server confirms it, and refusals stay visible and can be exported.
  - The existing access rules apply unchanged at sync time.
- **Bad / trade-offs:**
  - A second rendering path (the client field view) beside the server pages.
  - Route handlers whose payloads must stay versioned and backward-compatible, because a device may sync a payload from an older release.
  - Browsers can still evict storage, iOS more than others. Persistent storage, installing to the home screen and the warnings reduce this risk but don't remove it.
  - The field pack copies site contacts and tasks onto devices, so a lost phone holds that data until the pack expires (follow-up).
- **Follow-ups:**
  - An expiry for the field pack, and clearing it on sign-out.
  - Telling admins about refused items.
  - Offline editing, which needs real conflict rules.
  - Offline e2e scenarios using `context.setOffline(true)`.
  - Unit tests for the outbox: retries, duplicates, refusals and switching users.
