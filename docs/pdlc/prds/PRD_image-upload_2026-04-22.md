# PRD: Image Upload
<!-- pdlc-template-version: 2.1.0 -->

**Date:** 2026-04-22
**Status:** Approved
**Feature slug:** image-upload
**Roadmap ID:** F-001
**Episode:** _(assigned after ship)_
**Brainstorm log:** [brainstorm_image-upload_2026-04-22.md](../brainstorm/brainstorm_image-upload_2026-04-22.md)

---

## Overview

Image Upload gives a Kept user a way to attach their own photographs to items. It replaces the striped-gradient placeholder that currently renders for every item with a real picture of the thing being kept. Doing this well is prerequisite to Kept's core value proposition in `INTENT.md` ("an editorial photo album, not a spreadsheet") — without real photos, Kept is a well-designed database. Shipping first on the priority list because every downstream feature assumes real photos exist (F-002 edit, F-010 mobile capture, F-011 insurance export, F-019 self-host distribution).

---

## Problem Statement

Today, Kept renders a striped placeholder for every item. The user cannot tell a Nike Air Max from a vintage tin ornament without reading the title — visual recognition, the entire reason to keep an inventory, is missing. The feature also blocks future capabilities the user explicitly wants to preserve (reverse image search, AI-assisted tagging), so originals must be stored with fidelity even though those features are deferred.

---

## Target User

The **Busy Parent / Household Manager** persona from `INTENT.md`.

Two usage modes are in scope for this feature:

- **Steady state — phone-in-hand capture.** Parent stands in front of the attic box or the sneaker shelf, taps into Kept, chooses the item, attaches a photo taken right then (camera) or pulled from Photos Library, and saves. Budget: under a minute per item.
- **Bootstrap — laptop backfill.** One-time session of ~100 items in ~30 minutes, where the parent has an existing phone/camera-roll backlog and attaches one photo per already-created item via drag-drop or file-picker in a browser tab.

Secondary users (partner, grandparents) are captured by F-006 `multi-user-household` and are out of scope here.

---

## Requirements

*(RFC 2119 style: **MUST**, **SHOULD**, **MAY**.)*

### R-01 Input sources
**R-01.1** The system MUST allow a user to attach a photo to an existing item via the item detail page.
**R-01.2** On mobile (iOS/Android) and desktop, the photo input MUST use `<input type="file" accept="image/*">` without the `capture` attribute so the OS sheet offers Take Photo, Photo Library, and Choose File (Files.app → iCloud Drive, Dropbox, etc.).
**R-01.3** On desktop, the system MUST accept drag-and-drop onto the item detail page's dedicated drop target in addition to the file picker.
**R-01.4** The system MUST support attaching more than one photo per item. The first-uploaded photo becomes the hero; subsequent photos appear as thumbnails in a strip below the hero. Clicking a thumbnail swaps the hero.

### R-02 Validation
**R-02.1** The system MUST accept only JPEG, PNG, and WebP uploads, verified by **magic-byte sniffing** on the first 8 bytes of the file. Browser-supplied `contentType` MUST NOT be trusted.
**R-02.2** The system MUST reject any file whose size is strictly greater than **20 MB**. Files exactly at 20 MB are accepted.
**R-02.3** The system MUST reject any image whose decoded dimensions satisfy `width × height > 50_000_000 pixels`, before full decode or derivation. This prevents "image bomb" resource exhaustion.
**R-02.4** The system MUST reject zero-byte files with a human-readable "That file is empty" message.
**R-02.5** The client SHOULD perform size and magic-byte pre-checks using the browser File API before transmitting bytes, to avoid wasted upload time on invalid files.

### R-03 Persistence (upload server action)
**R-03.1** The upload server action MUST validate input with a Zod schema derived from `src/lib/validators/kept.ts`. Legacy `requestUploadSchema` and `confirmUploadSchema` (written against the handoff's presigned-URL model) MUST be replaced with a single `uploadPhotoSchema` matching the new stream-through-server flow.
**R-03.2** The server action MUST store the uploaded bytes **after stripping all EXIF metadata and physically baking orientation into pixels**. No file persisted to storage MUST contain EXIF data.
**R-03.3** The server action MUST write the EXIF-stripped original via `StorageAdapter.write()`, then insert an `item_images` row. On DB insert failure, the server action MUST `unlink` the just-written file. No orphan file MUST remain after any failure mode.
**R-03.4** The `write()` implementation of `LocalDiskStorage` MUST call `fsync` before returning, so a Pi power-loss immediately after response does not lose the persisted bytes while leaving the DB row claiming success.
**R-03.5** Storage keys MUST follow the scheme `items/{itemId}/{imageId}/{variant}.{ext}` where `imageId = nanoid(10)` and `variant ∈ {original, thumb, display}`. The uploaded file's original filename MUST NOT appear in the key.
**R-03.6** The server action MUST return within **≤ 5 seconds** on a Pi 5 for a 4 MB JPEG, measured from "bytes fully received" to "response returned". Derivation happens asynchronously afterward.

### R-04 Derivation (async queue)
**R-04.1** After a successful persist, the server action MUST enqueue a derivation job that produces two variants: a **200-wide WebP thumb** and an **800-wide WebP display** image.
**R-04.2** The derivation queue MUST be an in-process `p-queue` with `concurrency: 2`. System-wide, no more than two `sharp` jobs MUST run in parallel.
**R-04.3** On derivation success, the `item_images` row's `status` column MUST transition `pending → ready` and the `thumb_key` / `display_key` columns MUST be populated.
**R-04.4** On derivation failure, `status` MUST be set to `failed` and `last_error` MUST capture the error message.
**R-04.5** Before writing derivative output, each derivation job MUST verify its parent `items` row still exists. If the item was cascade-deleted, the job MUST exit silently and log the abort.

### R-05 Display
**R-05.1** When `status = ready`, the detail page hero MUST render the `display` (800 w) variant; the thumb strip and all other surfaces MUST render the `thumb` (200 w) variant.
**R-05.2** When `status = pending`, the detail page hero MUST render the EXIF-stripped original and show a small "processing…" badge. Browse masonry and Home mosaic may show the original or a placeholder at the implementation's discretion.
**R-05.3** When `status = failed`, the photo MUST render with a warning overlay reading "Photo processing failed".
**R-05.4** The variant-ready transition MUST NOT rely on live polling. The display MUST become correct on the next server-rendered page fetch (navigation, hard reload, or `router.refresh()`).
**R-05.5** When an item has no `item_images` rows, the UI MUST fall back to the existing striped-gradient placeholder rendered by `ItemPhoto`.

### R-06 Storage adapter
**R-06.1** All storage operations MUST route through a `StorageAdapter` interface exporting `write`, `read`, `delete`, `exists`, and `signedUrl`.
**R-06.2** `LocalDiskStorage` MUST ship as the real implementation, enabled by default.
**R-06.3** `S3Storage` MUST ship as a stub whose methods throw `NotImplementedError`. The real S3 implementation is deferred.
**R-06.4** The active backend MUST be resolved once at module initialization from the `STORAGE_BACKEND` env var (`local` | `s3`). Runtime hot-swap is not supported.
**R-06.5** `LocalDiskStorage.signedUrl(key, ttl)` MUST return a URL of the form `/api/images/[key]?t=<expires>&s=<hmac>`. The HMAC MUST be computed over the key + expiry using `IMAGE_URL_SECRET` (≥ 32 bytes, env-provided).
**R-06.6** The `/api/images/[key]` route handler MUST verify the HMAC, reject expired tokens with HTTP 401, reject path-traversal attempts (`..`, absolute paths) with HTTP 400, and stream the file bytes on success.

### R-07 Schema migration
**R-07.1** A new migration `0001_image_status.sql` MUST add `status` (`TEXT` with CHECK `status IN ('pending','ready','failed')`, default `'pending'`, NOT NULL) and `last_error` (`TEXT`, nullable) columns to `item_images`.

### R-08 Observability
**R-08.1** The upload action MUST log every attempt as a structured log line including `itemId`, `fileSizeBytes`, `contentType`, `outcome` (`success`|`failed`), and `durationMs`.
**R-08.2** The derivation queue MUST log every job transition (`started`, `completed`, `failed-with-error`) with the `item_images.id`.

---

## Assumptions

1. **iOS Safari auto-converts HEIC to JPEG** when uploaded via `<input type="file" accept="image/*">`. F-001 does not add server-side HEIC decode support. If this assumption breaks for any device, the file is rejected with a clear format error.
2. **`sharp` ARM64 prebuilt binaries** are available for Pi 5 (`linux-arm64`). If the prebuilt is ever missing, build-time compile from source is acceptable.
3. **Pi 5 disk I/O + SQLite WAL + sharp derivation** do not interfere enough to violate the 5 s persistence SLA at the single-user upload rate targeted.
4. **`STORAGE_LOCAL_DIR`** defaults to `./data/images/` relative to the running process. A Docker deploy (F-019) mounts this as a named volume.
5. **`IMAGE_URL_SECRET` is generated once** and kept stable; rotation breaks in-flight photo URLs for the ~60 s TTL window, which is acceptable.
6. **Process restarts are rare** on the target Pi deploy. Jobs lost from the in-process queue on restart are accepted v1 debt; a boot-time sweep is deferred.

---

## Acceptance Criteria

1. A user can attach a photo to an existing item via the detail page — tap-to-upload on mobile and drag-drop/file-picker on desktop both work.
2. Accepted formats are JPEG, PNG, and WebP **as verified by magic bytes** (not by the `contentType` header). A `.jpg` file whose actual bytes are an HTML document is rejected.
3. Files strictly larger than 20 MB are rejected with a clear message. Files exactly 20 MB are accepted.
4. Multiple photos per item are supported; the first uploaded photo is the hero and subsequent photos appear in a horizontal thumb strip under the hero. Clicking a thumb swaps the hero.
5. On a Pi 5 for a 4 MB JPEG, the server's persistence response returns within 5 seconds measured from "bytes fully received" to "response returned".
6. On upload failure from any cause, no orphan files remain in storage (verified by inducing a DB-insert failure and asserting an empty storage directory for the failed upload's item).
7. **No file persisted in Kept's storage contains EXIF metadata**, verified by running `exiftool` over post-upload files in a test fixture. Orientation is baked into pixels.
8. Photos from iPhone with portrait/landscape orientation metadata render right-side-up in all UI surfaces.
9. Each upload triggers background `sharp` derivation producing a 200-wide WebP thumb and an 800-wide WebP display variant.
10. At most 2 `sharp` jobs run in parallel system-wide. Verified by a load test that queues 10 simultaneous derivations and asserts the observed concurrency via queue introspection.
11. On derivation success, `item_images.status` transitions `pending → ready` and `thumb_key` + `display_key` are populated.
12. On derivation failure, `status` is set to `failed`, `last_error` captures the error, and the UI renders a warning overlay on the affected photo.
13. The detail page hero renders the `display` variant when `ready`, the EXIF-stripped original when `pending`, and a warning overlay when `failed`.
14. Browse masonry and Home mosaic render the `thumb` variant for items whose first photo is `ready` and the striped placeholder when no photo exists.
15. Variant swap appears on any server-rendered page fetch (navigation, hard reload, or `router.refresh()`). No live polling is required.
16. All storage operations go through the `StorageAdapter` interface; a grep for direct `fs.*` or `fs/promises` writes in `src/lib/actions/**` and `src/app/**` returns zero matches (except the adapter implementation itself).
17. `LocalDiskStorage` is the default backend when `STORAGE_BACKEND` is unset or `local`.
18. When `STORAGE_BACKEND=s3`, the app boots but any call to `S3Storage.*` throws `NotImplementedError` with a clear message referencing this PRD's deferral.
19. The upload server action emits one structured log line per attempt: `{itemId, fileSizeBytes, contentType, outcome, durationMs}`.
20. The derivation queue emits one structured log line per transition: `{imageId, phase: 'started'|'completed'|'failed', error?: string}`.
21. The app sustains **≥ 30 uploads within a 10-minute window** on a Pi 5 without p95 upload response time exceeding 6 seconds.
22. Concurrent-derivation cap is enforced — verified by the load test from AC #10.
29. On upload failure (any cause), no orphan files remain in storage. (Derives from R-03.3.)
30. Zero-byte files are rejected client-side with the message "That file is empty."
31. Files with decoded dimensions satisfying `width × height > 50_000_000` pixels are rejected with "Photo dimensions too large" and `sharp` is never invoked.
32. Storage keys use `items/{itemId}/{imageId}/{variant}.{ext}`. Verified by inspecting the post-upload storage tree. Original filename never appears.
33. Derivation jobs that discover their parent item was cascade-deleted exit silently and log `derivation_aborted_item_deleted`. No derivative files are written.
34. `/api/images/[key]` rejects requests with missing, expired, or invalid HMAC tokens with HTTP 401, and rejects path-traversal attempts with HTTP 400.
35. On mobile (iOS/Android) and desktop, the file input renders without the `capture` attribute so all three OS sources (camera, photo library, file picker) are available. Verified by DOM inspection of the rendered `<input>`.

### Out-of-scope acceptance (restated non-goals — features NOT shipped)

23. No fullscreen lightbox / photo viewer.
24. No photo deletion or reordering from F-001 UI (F-002 `item-edit` scope).
25. No explicit "set as hero" control.
26. No gen-AI tagging, reverse image search, or cloud photo imports.
27. No real `S3Storage` implementation.
28. No disk-full warnings or healthcheck endpoint (F-018 `health-ping`).

---

## User Stories

**US-001: Mobile photo capture and attach**
*Acceptance criteria: 1, 2, 5, 7, 8, 35*
Given I am on an item's detail page on iOS Safari
When I tap the dedicated photo-drop target
Then iOS presents a sheet with Take Photo, Photo Library, and Choose File
And I pick a 4 MB JPEG from my Photo Library
Then within 5 seconds the hero slot shows the EXIF-stripped original with a "processing…" badge
And on next navigation the hero shows the 800-wide display variant

**US-002: Laptop bulk backfill**
*Acceptance criteria: 1, 3, 4, 21*
Given I have 100 existing items without photos and a folder of 100 JPEGs
When I open each item's detail page in a browser and drag the corresponding photo onto the drop target
Then each upload responds within the 5-second budget
And I complete the 100-item session in under 30 minutes
And the server sustains ≥ 30 uploads in any 10-minute window without p95 response time exceeding 6 seconds

**US-003: Multiple photos per item**
*Acceptance criteria: 4, 9, 11, 15*
Given I have attached one photo to an item
When I return to the item and attach a second photo
Then both photos appear as thumbnails under a single hero
And clicking the second thumbnail swaps it into the hero
And each photo independently transitions through `pending → ready`

**US-004: EXIF privacy**
*Acceptance criteria: 7, 8*
Given I upload a photo taken on my iPhone at home with GPS metadata
When the server returns success
Then the file stored at `items/{itemId}/{imageId}/original.jpg` contains no EXIF data
And running `exiftool` over the file reports no location, device, or timestamp metadata
And the photo renders right-side-up in the UI

**US-005: Invalid file rejection**
*Acceptance criteria: 2, 3, 30, 31*
Given I am on an item's detail page
When I attempt to upload a 25 MB file OR a zero-byte file OR a `.jpg` whose bytes are actually HTML
Then the client rejects the file before any bytes leave the browser
And I see a specific error message (size / empty / format)
And no server request is made and no DB row is created

**US-006: Upload failure cleanup**
*Acceptance criteria: 6, 29*
Given an upload has written bytes to storage
When the DB insert fails for a transient reason
Then the server unlinks the written file before returning an error
And no orphan file remains in the storage directory
And the UI shows a retry button while the File object is still in memory

**US-007: Derivation failure visibility**
*Acceptance criteria: 12, 13*
Given I have uploaded a CMYK JPEG that `sharp` cannot process
When the derivation job fails
Then `item_images.status` is set to `failed` and `last_error` captures the reason
And the detail page hero renders the EXIF-stripped original with a "Photo processing failed" warning overlay
And a log line `{imageId, phase: 'failed', error}` is emitted

**US-008: Race — delete item during derivation**
*Acceptance criteria: 33*
Given a derivation job is running for a photo
When the parent item is deleted before the job completes
Then the derivation job detects the absent parent row, logs `derivation_aborted_item_deleted`, and exits
And no derivative files are written

**US-009: Signed URL security**
*Acceptance criteria: 34*
Given I have a valid signed URL for a photo
When I tamper with the HMAC signature or change the `t=<expires>` parameter
Then `/api/images/[key]` returns HTTP 401
And when I request `/api/images/../../etc/passwd`, the route returns HTTP 400

---

## Non-Functional Requirements

### Performance
- Server persistence ≤ 5 s on Pi 5 for a 4 MB JPEG (R-03.6).
- Sustained throughput ≥ 30 uploads / 10 min (AC #21).
- Derivation concurrency ≤ 2 system-wide (R-04.2, AC #10).
- Pre-decode dimension check prevents `sharp` from ever receiving a `>50 MP` image (AC #31).

### Security
- EXIF strip on originals — privacy non-negotiable (R-03.2, AC #7).
- Magic-byte content validation, not trusting MIME (R-02.1).
- Short-lived HMAC JWT signed URLs with ≤ 60 s TTL (R-06.5, AC #34).
- Path-traversal rejection on the image route (R-06.6).
- `IMAGE_URL_SECRET` ≥ 32 bytes; never logged; never returned to the client.
- `import "server-only"` at the top of every file in `src/lib/storage/*` to prevent client-code leakage.

### Accessibility
- The drop target + file input MUST be keyboard-reachable and focus-visible.
- Drag-drop MUST have an equivalent keyboard / click-based file-picker path (the `<input>` itself).
- Error messages MUST be readable by a screen reader (ARIA live region for inline errors).

### Operability
- Structured log lines suitable for `journalctl -u kept` grepping.
- `STORAGE_BACKEND`, `STORAGE_LOCAL_DIR`, `IMAGE_URL_SECRET` documented in `.env.example` and `CLAUDE.md`.
- Storage directory externalizable — defaults to `./data/images/`, overridable for Docker volume mounting (F-019 coupling).

---

## Out of Scope

*(Features explicitly deferred. All are recoverable into a later feature with no re-architecture required.)*

- **Lightbox / fullscreen photo viewer** — later feature or F-010.
- **Photo delete / replace / reorder UI** — F-002 `item-edit`.
- **Explicit "set as hero" control** — F-002.
- **Multi-photo multi-select attaching in one action** — later; F-008 addresses the related bulk-create pattern.
- **Gen-AI tagging** — preserved as possibility by storing high-fidelity originals; implementation deferred.
- **Reverse image search / perceptual hashing** — same.
- **Cloud photo-service deep integration** (Google Photos OAuth, Instagram import) — Files.app's service extensions already cover the "accessible as a file" common case.
- **Video uploads.**
- **Real `S3Storage` implementation** — ships as stub; enabled when public hosting is committed.
- **Disk-full warnings and healthcheck** — F-018 `health-ping`.
- **First-run / onboarding** — F-004.
- **Authentication and per-user photo isolation** — F-005 / F-006.

---

## Known Risks

*(Edge cases triaged as "known risk" during Discover Step 4.)*

- **Browser refresh / navigation mid-upload** (Edge #2) — impact: abandoned in-flight PUT leaves no side-effects because the server's try/unlink cleanup (AC #6) covers it. Deferred as separate handling because #1's cleanup already dominates.
- **Duplicate uploads** (Edge #8) — impact: two `item_images` rows with identical content. Deferred: content-hash dedup is a future enhancement; v1 user re-uploads are infrequent.
- **Disk full** (Edge #10) — impact: generic 500 + orphan partial file. Deferred to F-018 `health-ping`; `write()` fsync failure still triggers cleanup.
- **Process crash between DB insert and queue.add** (Edge #12) — impact: perma-`pending` row. Deferred: boot-sweep arrives when we migrate off `p-queue` (ADR-003). Manual recovery is `UPDATE item_images SET status='failed' WHERE status='pending' AND created_at < NOW()-1h`.
- **Filesystem read-only mount** (Edge #13) — out of scope; surfaces as an ops incident via F-018.
- **Items with 50+ photos** (Edge #14) — UI overflow of the thumb strip is ungraceful. Polished in F-010.
- **No down migration for `0001_image_status`** (Edge #16) — rolling back F-001 requires manual SQL. Acceptable: F-001 is additive; rollback is not a supported operation in v1.
- **Mobile Safari backgrounding kills in-flight upload** (surfaced during Q4 Round 4) — impact: user must re-select and re-upload. Accepted as platform limitation.
- **`IMAGE_URL_SECRET` rotation** (surfaced during Q5 follow-up) — impact: rotation invalidates in-flight URLs for ~60 s TTL window. Documented in README; acceptable for single-user LAN.

---

## Design Docs

- Architecture: [../design/image-upload/ARCHITECTURE.md](../design/image-upload/ARCHITECTURE.md)
- Data model: [../design/image-upload/data-model.md](../design/image-upload/data-model.md)
- API contracts: [../design/image-upload/api-contracts.md](../design/image-upload/api-contracts.md)
- Additional: Brainstorm log at [../brainstorm/brainstorm_image-upload_2026-04-22.md](../brainstorm/brainstorm_image-upload_2026-04-22.md); meeting minutes at [../mom/image-upload_progressive-thinking_mom_2026_04_22.md](../mom/image-upload_progressive-thinking_mom_2026_04_22.md)

---

## Related Episodes

*(None yet — F-001 is the first feature through PDLC.)*

---

## Approval

**Approved by:** user
**Date approved:** 2026-04-22
**Notes:** Approved as drafted. No feedback pending.
