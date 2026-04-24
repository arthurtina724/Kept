---
feature: image-upload
date: 2026-04-22
status: inception-complete
last-updated: 2026-04-22T23:20:00Z
approved-by: user
approved-date: 2026-04-22T23:20:00Z
prd: docs/pdlc/prds/PRD_image-upload_2026-04-22.md
design: docs/pdlc/design/image-upload/
plan: docs/pdlc/prds/plans/plan_image-upload_2026-04-22.md
---

# Brainstorm Log: image-upload

## Divergent Ideation
_Skipped — user chose to go straight to Socratic questioning._

## Socratic Discovery

**Started:** 2026-04-22T21:35:00Z
**Status:** Round 1 complete; Rounds 2–4 in progress.

### Round 1 — Problem Statement

**Q1:** What problem does image-upload specifically solve?

**A1:** Gives users real photos of their own things so they can see and recognize them at a glance — not stock or generated imagery. Originals must be stored with enough fidelity to support future capabilities (reverse image search, gen-AI auto-tagging) that are explicitly out of F-001 scope but shouldn't be foreclosed.

**Q2:** Who specifically will use this feature, and in what context?

**A2:**
- **Steady-state usage:** phone-in-hand moment — user standing in front of the thing (attic box, sneaker shelf), photographs it, it lands in Kept. Mobile-first.
- **Bootstrap moment:** one-time laptop batch — hundreds of existing camera-roll photos imported in a browser tab to backfill the initial library.

Both flows must exist at F-001 shipping. F-010 `mobile-capture` (later) will polish the mobile flow into the primary add path.

**Q3:** What does success look like for this feature?

**A3:**
- **Primary metric:** ≤ **5 seconds** server-side latency from shutter tap / file select to "Kept has persisted this photo" (original written to storage + DB row inserted + response returned). Human framing time is outside the budget.
- **Backfill target:** **100 items/session** sustained on the laptop flow (≈1 item every 18 seconds over 30 minutes).
- `% items with at least one photo` intentionally not tracked as a success metric.
- **Workflow:** Day-one pattern is one photo per item at ingestion, then return visits to add more photos by user-chosen priority. "Multiple photos per item" is a day-one requirement; "multi-select multiple photos for one item in one action" is out of F-001 scope.

**Q4:** What are the technical constraints or dependencies?

**A4:**
- **Target hardware:** Raspberry Pi 5 (8 GB RAM, 512 GB SSD). Multi-year household storage (~6 GB for 1000 items × 3 photos × 2 MB) fits comfortably.
- **HEIC / HEIF:** defer full server-side decode. Rely on Safari's auto-conversion to JPEG when uploaded. If the assumption breaks later, fail loud with a clear error.
- **Concurrency (Pi 5 — 4 cores):**
  - **Up to 6 concurrent upload accepts** — I/O-bound, browser-limited anyway.
  - **2-slot sharp derivation queue** — CPU-bound, libvips threaded at 2 threads/job. Three would compete; four would thrash. Leaves ~50% CPU headroom for Next + Drizzle to stay responsive.
- **Deletion:** hard-delete. No soft-delete or undo window — user's mental model is "if I delete it from Kept, I've also gotten rid of the physical item."
- **Design knob unlocked:** split "upload confirmed" (fast path — returns in <1s after original is on disk) from "thumbnails ready" (async — queue derivation, update row when done). UI optimistically renders the original until derivatives land.

**Q5:** What is explicitly out of scope?

**A5:** All of the following are deferred until after F-001–F-018 ship:
- Reverse image search / perceptual hashing
- Gen-AI auto-tagging on upload
- In-app photo editing (crop / rotate / exposure)
- Multi-photo multi-select for a single item in one action
- Drag-to-reorder gallery / set-hero-by-dragging
- Share / public-link / originals-download
- Video upload
- Cloud photo library import (Google Photos, iCloud)

**Q6:** What are the key risks or assumptions?

**A6:** User flagged two as top risks:

**R1 — Privacy / EXIF on originals.** GPS coordinates of the user's home must not exist in any file Kept has written to disk. Resolution: strip ALL metadata on the original before persisting — the "original" in Kept's storage is the EXIF-stripped version. Orientation physically baked into pixels (`sharp.rotate().withMetadata({})`) to avoid sideways rendering. Extends the 5-second SLA to cover the strip pass, not the raw PUT.

**R2 — `StorageAdapter` interface abstraction.** Resolution proposed: filesystem-first interface (`write / read / delete / exists / signedUrl`). S3 implements these natively. LocalDiskStorage implements `signedUrl` via short-lived JWTs validated by a Next image route. Uploads go through the server (stream-through-server) on LAN — no presigned PUTs in v1. Presigned PUT support can swap in later for cloud deploy without changing the interface. Neo will formalize in DESIGN.

Risks noted but not escalated (mitigations recorded):
- Pi hardware under load → 2-slot queue.
- HEIC edge cases → fail loud.
- Async derivation lost on crash → accept as v1 tech debt; boot-sweep added later.
- Adapter leaking to client code → `import "server-only"` at top of `src/lib/storage/*`.
- Disk fills silently → deferred to F-018 `health-ping`.

### Round 2 — Future State / Key Capabilities

**Q1 (mobile single-item add flow scope):**
**A:** Split confirmed: F-001 ships the **synchronous** add flow (photo uploads before Save completes). The **optimistic save-while-uploading** flow stays in F-010 `mobile-capture`. User confirmed Kept is not being built for public use right now, so defaults assume LAN / single-user / no rate-limiting in F-001.

**Q2 (laptop bulk flow shape):**
**A:** **(a) Attach-photo-to-existing-item only** in F-001 — drag-drop or file-picker on the item detail page. Bulk-create-from-photos defers to **F-008 `bulk-add`**. The 100-item backfill session is a two-feature workflow: F-008 creates items, F-001's attach flow adds photos.

**Q3 (item detail page photo UX):**
**A:** Accepted the recommended minimal scope:
- Hero = first photo uploaded (no "set as hero" control in F-001).
- Multiple photos supported; horizontal thumb strip under hero; click-to-swap-hero.
- No fullscreen lightbox in F-001.
- No delete / reorder / replace in F-001 (rides in F-002 `item-edit`).

**Q4 (upload → derivation → display state machine):**
**A:** Accepted the recommendation across all three sub-decisions:
- "Persisted, pending derivatives" renders the EXIF-stripped original (browsers downscale; LAN bandwidth is fine).
- **No polling** — derivative swap appears on next navigation or refresh. Cheap, honest, upgradeable later.
- Retry button works only while the `File` is still in memory — no ghost retry after navigation.

**Q5 (operational visibility):**
**A:** Accepted **(A) + (B)**:
- Dev-only structured logs in upload action and derivation queue.
- New `item_images.status` column (`pending` | `ready` | `failed`) + `last_error` text column. Will ship as migration `0001_image_status.sql`.
- Admin/debug view deferred — absorbed by F-018 `health-ping`.

### Round 3 — Acceptance Criteria

**Q1:** All 28 acceptance criteria drafted and accepted as-is. Full list recorded below.

**Functional — Upload:**
1. User can attach a photo to an existing item via the detail page (laptop: drag-drop or file picker; mobile: tap → native camera/library sheet).
2. Supported formats: JPEG, PNG, WebP. HEIC accepted if Safari pre-converts; otherwise rejected with a clear error.
3. Max file size: 20 MB per upload. Files larger rejected client-side with a clear message.
4. Multiple photos per item supported; first uploaded is hero, subsequent photos appear in a horizontal thumb strip below hero.
5. Server returns success within **≤ 5 seconds** on a Pi 5 for a 4 MB JPEG (file bytes received → EXIF-stripped original persisted → DB row inserted → response returned).
6. On upload failure: storage cleaned up (no orphan files), no DB row written, UI shows inline error with Retry (valid only while File is in memory).

**Privacy:**
7. No file persisted in Kept's storage contains EXIF metadata. Verified by `exiftool` on post-upload files.
8. iPhone orientation metadata baked into pixels; photos render right-side-up.

**Derivation (async):**
9. Each upload triggers background generation of 200w WebP thumb and 800w WebP display variant.
10. Max **2 concurrent** sharp jobs system-wide.
11. On success: `item_images.status` flips `pending → ready`; `thumb_key` / `display_key` populated.
12. On failure: `status = failed`, `last_error` populated. UI renders a warning badge.

**Display:**
13. Detail page hero renders: `display` variant when `ready`; EXIF-stripped original when `pending`; warning overlay when `failed`.
14. Browse masonry / Home mosaic use the `thumb` variant when `ready`; fall back to striped placeholder when no photo exists.
15. Variant swap does not require live polling — appears on next navigation / refresh.

**Storage adapter (architectural):**
16. All storage operations route through a `StorageAdapter` interface with `write`, `read`, `delete`, `exists`, `signedUrl`.
17. `LocalDiskStorage` implementation ships enabled by default.
18. `STORAGE_BACKEND=local` is the env switch; `s3` is accepted as a value but `S3Storage` ships as a stub throwing "not implemented."

**Observability:**
19. Upload action logs (structured) every attempt: item ID, file size, content-type, outcome, duration.
20. Derivation queue logs every job transition: started, completed, failed-with-error.

**Non-functional:**
21. Pi 5 sustains ≥ 30 uploads in a 10-minute window without degraded response time.
22. Concurrent derivation cap (2 slots) enforced.

**Out of F-001 (explicit non-goals):**
23. No lightbox / fullscreen photo viewer.
24. No photo deletion or reordering (deferred to F-002).
25. No set-as-hero control (deferred).
26. No gen-AI tagging, reverse image search, or cloud import.
27. No `S3Storage` real implementation.
28. No healthcheck endpoint or disk-full warnings (deferred to F-018).

### Round 4 — Current State

**Q1 (existing codebase state + local env constraints):**
**A:** Read confirmed accurate. No additional local-env constraints. During this round the user also decided to switch from npm to pnpm — recorded as **ADR-001** in `DECISIONS.md`. Package manager pinned via `packageManager: "pnpm@10.33.0"`; `pnpm.onlyBuiltDependencies` whitelist added for `better-sqlite3`, `esbuild`, `sharp`.

**What exists before F-001:**
- Drizzle schema with `item_images` table (`originalKey`, `thumbKey`, `displayKey`, `displayOrder`, `contentType`, `sizeBytes`, `width`, `height`, `createdAt`).
- Zod validators `requestUploadSchema` + `confirmUploadSchema` written against the handoff's presigned-URL flow (**will need rewrite** — F-001 departs from presigned-URL in favor of stream-through-server).
- `src/lib/placeholder.ts` + `src/components/ui/ItemPhoto.tsx` render striped-gradient fallback end-to-end.
- `src/app/items/[id]/page.tsx` fetches `ItemWithRelations` with `images` array + `heroPhotoUrl` field (currently always `null`).
- `AddItemDialog.tsx` photo-drop UI is visually wired only — no upload action attached.
- `BrowseGrid.tsx` and home page pass `placeholder` + null `photoUrl` today.
- Server action + `ActionResult<T>` + `revalidatePath` pattern is set in `src/lib/actions/kept.ts`.

**What F-001 must add:**
1. `src/lib/storage/` directory — `StorageAdapter` interface + `LocalDiskStorage` impl + `S3Storage` stub + env-driven config loader.
2. `src/lib/storage/signer.ts` — short-lived JWT signed-URL issuer for local-disk files.
3. `src/app/api/images/[key]/route.ts` — Next route handler that validates signed-URL tokens and streams file bytes.
4. In-process 2-slot derivation queue (Neo to pick library during DESIGN).
5. Migration `0001_image_status.sql` adding `status` + `last_error` columns.
6. Server actions `uploadPhoto(itemId, file)` and `deletePhoto(imageId)` stub.

**Dependencies to add:**
- `sharp` (ARM64 prebuilt exists for Pi 5).
- Queue library (Neo's call — likely `p-queue`).
- `jose` for JWT signing.
- No S3 SDK yet (stub only).

## Progressive Thinking (Agent Team Meeting)

**MOM:** [image-upload_progressive-thinking_mom_2026_04_22.md](../mom/image-upload_progressive-thinking_mom_2026_04_22.md)
**Completed:** 2026-04-22T22:30:00Z

### Confirmed Facts
- Clean-slate storage layer; schema columns already in place.
- Pi 5 (8 GB / 512 GB SSD) is generous for F-001.
- LAN-only, single-user, no auth in F-001.
- pnpm locked via ADR-001.

### Accepted Inferences
- Next Server Action `FormData` handles file uploads natively (no Multer-equivalent needed).
- Narrow `StorageAdapter` interface: `write / read / delete / exists / signedUrl`.
- HMAC JWT signed URLs with ~60s TTL even on trusted LAN.
- Integration tests use real SQLite + real filesystem + real sharp (vitest + temp dirs).
- Adapter config resolved at module init; no runtime hot-swap.

### Key Consequences
- New code: `src/lib/storage/*`, `src/app/api/images/[key]/route.ts`, migration `0001_image_status.sql`, server actions `uploadPhoto` + `deletePhoto` stub, reshape of `AddItemDialog` / `DetailGallery` / `ItemPhoto`. ~600-900 LOC estimate.
- New tests: ~20 cases across upload / EXIF / derivation / status.
- Env surface: `STORAGE_BACKEND`, `STORAGE_LOCAL_DIR`, `IMAGE_URL_SECRET` minimum.
- F-019 Dockerfile must expose a named volume for storage directory.

### Risks & Unknowns
- Content-type spoofing (new gap — mitigated by ADR-004 magic-byte sniff).
- sharp silently corrupting edge-case images (mitigated by `status=failed` fallback).
- Mobile Safari killing uploads mid-flight (documented as known limitation).
- In-process queue loses jobs on restart (accepted v1 debt — ADR-003).

### Conflicts Resolved
- **5.1 File validation** — magic-byte sniff required (ADR-004).
- **5.2 Derivation library** — `p-queue` with `concurrency: 2` (ADR-003).
- **5.3 Storage backend** — `StorageAdapter` interface with `LocalDiskStorage` real + `S3Storage` stub (ADR-002).
- No user escalation required — team reached consensus on all three.

### Design Priorities (ranked for Neo's DESIGN sub-phase)
1. `StorageAdapter` interface shape (one chance to get right).
2. EXIF strip on originals (privacy; verified by exiftool integration test).
3. Magic-byte content sniffing (defense in depth).
4. Derivation queue concurrency cap (Pi CPU headroom).
5. Shared error copy (`src/lib/copy.ts`) for F-002/F-010 reuse.

**Deferred / simplify:** durable queue, polling for readiness, admin/debug view, real `S3Storage` impl, boot-sweep for stuck `pending` rows.

## Adversarial Review

**Completed:** 2026-04-22T22:40:00Z

### Findings (12)

1. **Total-time metric clarity** — 5s is server-side only; client experience includes Wi-Fi variability. (Med)
2. **"100 items in 30 min" is aspirational** — not automatically measurable. Kept as a north-star target, not a gate. (Low — resolved internally)
3. **EXIF-strip-on-original discards GPS forever** — insurance-grade "proof photo was taken in my home" is impossible after F-001. (Med)
4. **`write()` fsync required** — without it, Pi power-loss 30 ms after upload could lose the file while the DB row claims success. (Med — resolved internally: adapter `write()` fsyncs before returning)
5. **Concurrency cap is a system-wide singleton** — becomes shared bottleneck when F-006 multi-user lands. (Low — documented as known limitation)
6. **Failed-photo recovery UI missing** — with 100 bulk items, no way to find which photos are `failed`. (Med)
7. **No client-side pre-check** — oversize/wrong-type files waste 10+ seconds of LAN upload before server rejects. (Med)
8. **Key format mixes extensions** (`original.jpg` + `thumb.webp` + `display.webp`) — mildly inconsistent but adapter-agnostic. (Low — resolved internally, documented in interface)
9. **`IMAGE_URL_SECRET` rotation not addressed** — leak-recovery plan missing. (Low — resolved internally: generate once, documented that rotation breaks in-flight URLs for ~60s TTL window)
10. **Drop-zone scope on detail page** — full-page vs. dedicated area; mis-drop is destructive. (Med)
11. **AC #15 "appears on next navigation" imprecise** — clarified in PRD as "any server-rendered page fetch (navigation, hard reload, or `router.refresh()`)." (Low — resolved internally)
12. **pnpm version pin in F-019 Docker** — ADR-001 pinned `pnpm@10.33.0`; Docker must use same via Corepack. (Low — deferred to F-019 planning)

### Follow-up Q&A

**Q1 (Finding 1 — success metric scope):** Server-side only, or end-to-end?
**A1:** **Server-side only.** "File bytes received → response returned." Clean, testable, excludes Wi-Fi variability. Client-side perceived latency is a qualitative observation, not a gate.

**Q2 (Finding 3 — EXIF-on-original trade-off):** Keep a raw GPS-tagged copy for future insurance utility, or commit to privacy-first?
**A2:** **Privacy-first. EXIF strip on the original is final.** No raw copy retained. Documented trade-off: GPS/camera metadata cannot be recovered from Kept's stored files. Future insurance-documentation features (F-011) will work from content, not EXIF.

**Q3 (Finding 6 — failed-photo recovery):** Defer to F-002 or ship a minimal counter now?
**A3:** **Defer to F-002 `item-edit`.** F-001 surfaces only the detail-page status + warning badge. Finding failed items = manual browse. No home-view counter.

**Q4 (Finding 7 — client-side pre-check):** Pre-check in the browser or server-side only?
**A4:** **Pre-check client-side.** Size + magic-byte sniff via browser File API before the upload fires. ~30 LOC. Saves 5–15 s on wrong-file selections.

**Q5 (Finding 10 — drop zone):** Dedicated or full-page?
**A5:** **Dedicated drop target.** The "add photo" slot visually becomes the drop area during drag. Hard to mis-drop into the wrong item.

## Edge Case Analysis

**Completed:** 2026-04-22T22:45:00Z

### Findings

| # | Category | Scenario | Trigger | Addressed? | Risk if unhandled |
|---|---|---|---|---|---|
| 1 | User flow | Network drops mid-upload on LAN | Wi-Fi disconnects during PUT | No | Partial file on disk; orphaned bytes |
| 2 | User flow | Browser refresh / navigation mid-upload | User hits F5 during upload | No | Abandoned in-flight PUT; orphan |
| 3 | Empty data | Zero-byte file | User selects an empty `image.jpg` | No | sharp throws; cryptic UI error |
| 4 | Boundary | File exactly at 20 MB | Edge case of AC #3 | Partial | Ambiguous rejection |
| 5 | Empty data | Extreme-dimension image (100k × 100k) | Crafted "image bomb" | No | sharp OOM crashes Node |
| 6 | Invalid input | Unicode / emoji in filename | Real-world iPhone filenames | No | Storage key encoding issues |
| 7 | Invalid input | Filename 300+ chars | Bizarre but possible | No | Filesystem ENAMETOOLONG |
| 8 | Invalid input | Duplicate upload (same bytes twice) | User re-selects same photo | No | Two `item_images` rows, identical content |
| 9 | Concurrency | Delete item while derivation pending | Race between delete + queue job | No | Queue writes to cascade-deleted row/key |
| 10 | Scale | Disk fills mid-upload | SSD at capacity | No | Opaque 500 + orphan partial file |
| 11 | Partial completion | Original written, DB row insert fails | Transient DB error after fsync | No | Orphan file on disk forever |
| 12 | Partial completion | DB row inserted, queue.add crashes | Process dies in microsecond gap | No | Perma-`pending` row |
| 13 | Integration | Filesystem read-only mount | SSD mount issue | No | Confusing errors |
| 14 | Scale | Item has 50+ photos | Power user after F-001 | No | Thumb strip overflow |
| 15 | Permission | JWT forgery at `/api/images/[key]` | Attacker forges HMAC | Partial | Unauthorized photo access |
| 16 | Migration | Down migration for `0001_image_status` | User rolls back F-001 | No | Manual SQL needed to revert |

### Triage Decisions

| # | Decision | Acceptance criterion / note |
|---|---|---|
| 1 | **In scope** | Server action wraps write in try/unlink on error; UI shows retry. New AC: "On upload failure, no orphan files remain in storage." |
| 2 | **Known risk** | Inherited from #1 cleanup; browser cancels PUT and server's try/unlink handles it. |
| 3 | **In scope** | Client-side pre-check rejects zero-byte files with message "That file is empty." |
| 4 | **In scope** | AC #3 clarified: files `> 20 MB` rejected; exactly 20 MB accepted. |
| 5 | **In scope** | Pre-decode dimension check rejects `width × height > 50_000_000` pixels with clear error. |
| 6 | **In scope** | Storage key derived from `itemId` + random UUID (`nanoid`); original filename never used as path component. |
| 7 | **In scope** | Same as #6 — filename never in path. |
| 8 | **Known risk** | F-001 accepts duplicates; deduplication is a future enhancement. |
| 9 | **In scope** | Derivation job checks `items` row still exists before writing back; exits silently if cascade-deleted. |
| 10 | **Known risk** | Deferred to F-018 `health-ping`; `write()` fsync failure still triggers cleanup. |
| 11 | **In scope** | Server action order: write → insert → on insert error, unlink. New AC. |
| 12 | **Known risk** | Boot-sweep deferred (noted in ADR-003); acceptable v1. |
| 13 | **Out of scope** | Ops failure surfaced via F-018; F-001 returns generic 500 + log entry. |
| 14 | **Known risk** | Thumb strip overflows ungracefully until F-010 polishes. |
| 15 | **In scope** | Phantom-flagged; DESIGN specifies exact HMAC signature format + key-path traversal rejection. |
| 16 | **Known risk** | No down migrations in F-001. Documented. |

**Additional acceptance criteria** derived from triage (to be appended to the PRD's Acceptance Criteria list):

- **AC #29:** On upload failure (any cause), no orphan files remain in storage. Verified by test: induce DB insert failure and assert no files on disk.
- **AC #30:** Zero-byte files are rejected client-side with message "That file is empty."
- **AC #31:** Files where `width × height > 50_000_000` pixels are rejected with a "Photo dimensions too large" message. Prevents sharp OOM.
- **AC #32:** Files exactly at 20 MB are accepted; files > 20 MB are rejected.
- **AC #33:** Storage keys are `items/{itemId}/{imageId}/{variant}.{ext}` where `imageId = nanoid(10)`. Original filename is never a path component.
- **AC #34:** Derivation worker checks `items.id` still exists before writing derivative results. If the item was deleted, worker exits silently with a log entry.
- **AC #35:** `/api/images/[key]` route rejects requests with missing, expired, or invalid HMAC tokens with HTTP 401; rejects path-traversal attempts (`..`, absolute paths) with HTTP 400.

**Known risks documented in PRD:**
- Duplicate uploads create distinct `item_images` rows (no content-hash dedup in v1).
- Disk-full conditions surface as generic 500 until F-018 `health-ping` lands.
- Process crash between `item_images` insert and queue enqueue leaves the row `pending` forever. Boot-sweep deferred; manual fix is `UPDATE item_images SET status='failed' WHERE status='pending' AND created_at < NOW()-1h;`.
- Items with 50+ photos render with overflow; F-010 will polish.
- No down migration for `0001_image_status`; rollback requires manual SQL.
- Filesystem read-only conditions return opaque 500; ops failure surface via F-018.

## External Context

**None ingested.** F-001 builds on an in-house codebase with no external docs or APIs to consume beyond what the handoff bundle in `kept/` already provided (already internalised during the pre-PDLC scaffolding phase). Third-party libraries to be introduced (`sharp`, `p-queue`, `jose`, `file-type`) have well-known APIs that Neo will reference directly during DESIGN.

## Discovery Summary

**Approved:** 2026-04-22T22:50:00Z by user

**Feature.** Image upload + async thumbnail derivation for Kept items.

**Problem.** Kept currently shows striped-gradient placeholders for every item. Real photos of the user's own things are the *primary* reason to keep an inventory at all — visual recognition, memory, and (eventually) content-based search. Without image-upload, Kept is a more beautiful spreadsheet.

**User & context.** The Busy Parent / Household Manager persona, in two usage modes:
- **Steady state:** phone in hand, standing in front of the thing. Tap the photo-drop area → native iOS sheet offers **Take Photo**, **Photo Library**, and **Choose File** (Files.app → iCloud Drive, Dropbox, etc.). F-001 supports all three sources. F-010 `mobile-capture` will later add a dedicated camera-first "Take Photo" button on top.
- **Bootstrap:** one-time laptop backfill of the existing camera-roll (≈100 items, one photo per item, ≈30 min) via drag-drop or file picker from Photos, Finder, or any OS source.

F-001 ships both paths synchronously; F-010 adds optimistic save and mobile-polished flows.

**Success metric.** **Server-side persistence ≤ 5 seconds** per photo on a Pi 5 for a 4 MB JPEG (file bytes received → EXIF-stripped original persisted → DB row inserted → response returned). Self-reported backfill target: 100 items / 30 min, not an automated gate.

**Technical constraints & decisions.**
- Target hardware: Raspberry Pi 5 (8 GB, 512 GB SSD), LAN-only, single-user, no auth in F-001.
- Storage: pluggable `StorageAdapter` (ADR-002). `LocalDiskStorage` real; `S3Storage` stub. Signed URLs via HMAC JWT (~60s TTL) served through a Next API route.
- Derivation: in-process `p-queue` (ADR-003), `concurrency: 2`. `sharp` generates 200w thumb + 800w display WebP variants asynchronously; UI renders the EXIF-stripped original until they land.
- Validation: magic-byte sniff server-side + client-side pre-check (ADR-004). MIME is never trusted. JPEG / PNG / WebP only. 20 MB cap (inclusive of exactly 20 MB), 50 MP pixel cap.
- Privacy: EXIF strip on originals — no file in Kept's storage contains metadata. Orientation baked into pixels. GPS discarded permanently (trade-off accepted).
- State machine: `pending` (original stored, derivatives queued) → `ready` (all variants exist) or → `failed` (status badge shown). New `item_images.status` + `last_error` columns via migration `0001`.
- Package manager: pnpm (ADR-001).
- HTML file-input attribute: `<input type="file" accept="image/*">` without `capture` — deliberately, to allow library selection. `capture="environment"` is deferred to F-010 on a dedicated button.

**Out of scope (confirmed).** Reverse image search, gen-AI tagging, in-app editing, multi-select-for-single-item, drag-to-reorder, lightbox, photo delete/replace (→ F-002), share/export, video, cloud-service deep-integration (Google Photos OAuth, etc.), real `S3Storage` impl.

**Key risks & known limitations.**
- In-process `p-queue` loses jobs on Pi restart (boot-sweep deferred).
- Duplicate uploads create duplicate rows (no content-hash dedup in v1).
- Disk-full surfaces as a generic 500 until F-018 `health-ping`.
- `IMAGE_URL_SECRET` rotation breaks in-flight URLs for the ~60s TTL window.
- No down migration for `0001_image_status`.
- Items with 50+ photos overflow the thumb strip ungracefully until F-010 polishes.
- Mobile Safari backgrounding can kill uploads mid-flight; user retries from scratch.

**Acceptance criteria: 36 total** — functional (1–6), privacy (7–8), derivation (9–12), display (13–15), storage adapter (16–18), observability (19–20), non-functional (21–22), non-goals (23–28), edge-case-derived (29–35), input-source (36).

**AC #36 (added per user request on final summary review):** On mobile (iOS/Android) and desktop (macOS/Windows), the photo input accepts uploads from the **camera**, **photo library**, and **file picker** via a standard `<input type="file" accept="image/*">`. The file input explicitly does **not** set `capture="environment"` — adding that attribute would force camera-only on iOS and is deferred to F-010 on a dedicated "Take Photo" button.

**ADRs finalised during this brainstorm:**
- ADR-001 — Package manager: pnpm.
- ADR-002 — Image storage backend: pluggable `StorageAdapter`.
- ADR-003 — Derivation queue: in-process `p-queue`.
- ADR-004 — Content-type validation: magic-byte sniff required.
