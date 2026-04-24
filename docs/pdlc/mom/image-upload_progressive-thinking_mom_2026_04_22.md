# MOM — Progressive Thinking: image-upload

**Meeting type:** Progressive Thinking (Agent Team Meeting)
**Feature:** image-upload (F-001)
**Date:** 2026-04-22
**Called by:** Oracle
**Attendees:** Neo, Bolt, Friday, Echo, Phantom, Muse, Pulse, Jarvis
**Duration:** ~4 minutes
**Purpose:** Stress-test F-001 discovery; resolve ADR-TBD (storage backend)

---

## Discussion

### Round 1 — Concrete facts

Confirmed shared ground:
- `item_images` schema already has object-key columns; no storage module / sharp / queue exists yet.
- Placeholder rendering pipeline is end-to-end; real-photo pipeline is net-new.
- CONSTITUTION mandates server-first, server-action mutations, Zod, server-only DB access, S3-keys-only.
- ADR-001 locked pnpm; no test harness yet.
- Target: Pi 5 8GB + 512GB SSD on LAN. Single-user, no auth in F-001.

### Round 2 — Inferences

- `uploadPhoto` uses Next Server Action `FormData` file arg — no Multer-style middleware needed (Bolt).
- `StorageAdapter` interface: `write / read / delete / exists / signedUrl`; `list` omitted in F-001, add when F-006 arrives (Neo).
- Signed URLs on local disk use HMAC JWT with ~60s expiry, even on trusted LAN (Phantom).
- Detail gallery reshaped to iterate `item.images` in place of hardcoded `[0..3]` (Friday).
- Integration tests use real SQLite + real filesystem + real sharp; vitest + temp dir per test (Echo).
- Adapter config resolved at module init; runtime hot-swap not needed (Pulse).

### Round 3 — Consequences

New code: `src/lib/storage/*`, `src/app/api/images/[key]/route.ts`, migration `0001_image_status.sql`, server actions `uploadPhoto` + `deletePhoto` stub, reshape of `AddItemDialog` / `DetailGallery` / `ItemPhoto`. ~600-900 LOC estimate.
New tests: upload success/oversize/bad-MIME, EXIF-strip verification via `exiftool`, derivation concurrency cap, status transitions. ~20 cases.
Env surface: `STORAGE_BACKEND`, `STORAGE_LOCAL_DIR`, `IMAGE_URL_SECRET` minimum.
Docs: storage section in README, `.env.example` additions, CLAUDE.md reference.

### Round 4 — Speculative gaps surfaced

- **New risk — content-type spoofing.** Browser-provided MIME is user-controllable. Need magic-byte sniff on upload.
- sharp may silently corrupt edge-case images (CMYK, progressive) — fallback: mark `status=failed`, keep EXIF-stripped original viewable.
- Adapter migration must keep keys adapter-agnostic (`items/{id}/originals/{uuid}.jpg` format survives backend change).
- Mobile: iOS backgrounding can kill upload mid-flight. Retry requires re-selecting file. Document as known limitation.
- In-process queue loses jobs on restart. Boot-sweep deferred as v1 debt.
- F-019 Docker image needs a named volume for storage dir — without it, photos vanish on container restart.
- F-019 README must call out F-017 `nightly-backup` dependency.

### Round 5 — Conflicts & resolutions

**Conflict 5.1 — File validation: magic-byte sniff vs. MIME trust (Phantom vs. Bolt).**
Resolution: **Phantom's position accepted.** Magic-byte sniff on the upload server action before any write. Rejected before `StorageAdapter.write()`. Add `file-type` dep (~20 KB) or hand-roll 3-4 format signatures. Sharp's parse-attempt is a second layer of defense, not a replacement.

**Conflict 5.2 — Derivation library: p-queue vs. BullMQ/Redis vs. worker-threads (Bolt vs. Neo).**
Resolution: **`p-queue` with `concurrency: 2`.** Durable-queue migration deferred to post-public or post-multi-user. Lost-on-restart jobs accepted as documented tech debt.

**Conflict 5.3 — ADR-TBD: Storage backend shape (Bolt "just filesystem" vs. Neo "StorageAdapter interface" vs. Pulse "MinIO").**
Resolution: **Neo's shape — `StorageAdapter` interface with `LocalDiskStorage` real + `S3Storage` stub.** Interface cost (~70 LOC) is cheap insurance vs. refactoring all server actions during future cloud migration. Friday, Phantom, Echo all sided with Neo; Pulse recanted partially once the MinIO RAM cost was surfaced. Bolt's YAGNI objection noted but overruled given the migration-path risk. **→ Finalized as ADR-002 in `DECISIONS.md`.**

No user escalation required — team reached consensus on all three.

### Round 6 — Design priorities (ranked)

1. **StorageAdapter interface design** (Neo — DESIGN) — shape it once, live with it for years.
2. **EXIF strip on originals** (Phantom + Echo) — privacy; verified by automated exiftool test.
3. **Magic-byte content sniffing** (Phantom) — defense against file-type spoofing. New gap.
4. **Derivation queue concurrency cap** (Bolt + Echo) — Pi CPU headroom.
5. **Shared error copy** (Muse) — `src/lib/copy.ts` for F-002 / F-010 reuse.

Deferred / simplify: durable queue, polling for readiness, admin/debug view, real S3 impl, boot-sweep for stuck `pending`.

---

## Conclusion

### Confirmed facts
- Clean-slate storage layer; schema columns already in place.
- Pi 5 hardware (8 GB / 512 GB SSD) is generous for F-001.
- LAN-only, single-user, no auth in F-001.
- pnpm locked via ADR-001.

### Accepted inferences
- Next Server Action `FormData` handles file uploads natively.
- Narrow `StorageAdapter` interface (`write/read/delete/exists/signedUrl`).
- HMAC JWT signed URLs (~60s) even on LAN.
- `vitest` integration tests on dev boxes + Pi target.

### Key consequences
- ~600-900 new LOC across storage module, route handler, server actions, UI reshape.
- Migration `0001_image_status.sql` adds `status` + `last_error` columns.
- Env surface grows by 3-4 vars; README + CLAUDE.md updated in ship.
- F-019 must ship with a named Docker volume for the storage dir.

### Risks & unknowns (top items from Round 4)
- Content-type spoofing (new, now mitigated via magic-byte sniff).
- sharp silently corrupting edge-case images (mitigated via `status=failed` fallback).
- Mobile Safari killing uploads mid-flight (documented as known limitation).
- In-process queue loses jobs on restart (accepted v1 debt).

### Resolved conflicts
- 5.1 Magic-byte sniffing **accepted**.
- 5.2 `p-queue` over BullMQ **accepted**.
- 5.3 `StorageAdapter` interface over "just filesystem" or "MinIO" **accepted** → ADR-002.

### User escalation answers
None — all conflicts resolved by the team.

### Design priorities
1. `StorageAdapter` interface
2. EXIF strip on originals
3. Magic-byte content sniffing
4. Derivation queue concurrency cap
5. Shared error copy

---

## Escalation

No questions escalated to the user. All decisions reached by team consensus.
