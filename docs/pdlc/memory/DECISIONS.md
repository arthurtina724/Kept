# Decision Registry

**Project:** Kept
**Last updated:** 2026-04-22

<!-- PDLC Decision Registry (ADR format).
     Entries are appended by:
     - User: via /pdlc decision <text>
     - Agents: during Construction/Review (Step 14) and Reflect (Step 7)
     Each entry records: what was decided, who decided, why, what was considered,
     and what cross-cutting impacts were applied.
     This file is append-only. Mark superseded decisions as [SUPERSEDED by ADR-NNN]. -->

---

## Open ADRs (pending resolution)

<!-- None currently open. -->

---

## Finalised Decisions

### ADR-001 — Package manager: pnpm

**Status:** Accepted
**Date:** 2026-04-22
**Decided by:** User (during F-001 brainstorm, Round 4)

**Decision.** Use **pnpm** (pinned via `packageManager: "pnpm@10.33.0"` in `package.json`) as the canonical package manager for Kept. `package-lock.json` is removed; `pnpm-lock.yaml` is the committed lockfile.

**Rationale.**
- Aligns with the handoff bundle's tech-stack-spec.md which prescribed pnpm.
- Content-addressed store saves real disk on the Pi target and shrinks Docker image layers when F-019 lands.
- Strict dependency hoisting catches phantom-dependency bugs early.
- `packageManager` field + Corepack auto-activates the correct version without per-machine setup.

**Options considered.**
1. **npm** (what we scaffolded with). Universal ecosystem support, no decisions needed. Kept using it would have been fine — no feature is blocked by npm.
2. **pnpm** (chosen). Faster, smaller, stricter; matches handoff spec.
3. **yarn / bun / deno.** Not considered — no reason to deviate from the handoff recommendation.

**Cross-cutting impacts applied on 2026-04-22.**
- `package.json` gains `packageManager` pin and a `pnpm.onlyBuiltDependencies` whitelist (`better-sqlite3`, `esbuild`, `sharp`). pnpm 10 does not auto-run native-build scripts — this whitelist is required for `better-sqlite3` to compile.
- `README.md` and `CLAUDE.md` updated: `npm ...` → `pnpm ...`.
- CONSTITUTION §1 tech-stack table retains "Package manager" implicitly under runtime; not edited separately.
- F-019 `self-host-distribution` Dockerfile will target pnpm (Corepack-based, no separate install step needed).

---

### ADR-002 — Image storage backend: pluggable `StorageAdapter`

**Status:** Accepted
**Date:** 2026-04-22
**Decided by:** Agent team (Progressive Thinking meeting, F-001 brainstorm, Round 5 Conflict 5.3) — consensus, no user escalation required
**Supersedes:** ADR-TBD (storage backend) raised during /pdlc init

**Decision.** F-001 introduces a narrow `StorageAdapter` interface with methods `write`, `read`, `delete`, `exists`, and `signedUrl`. Two implementations:

- **`LocalDiskStorage`** — real implementation. Writes to `./data/images/{itemId}/{imageId}/{original|thumb|display}.{ext}`. `signedUrl` issues a short-lived HMAC JWT (~60s TTL) that is validated by `src/app/api/images/[key]/route.ts` before streaming the file bytes.
- **`S3Storage`** — stub that throws "not implemented" in F-001. Real implementation lands when/if public hosting is committed.

Backend is selected at module init via the `STORAGE_BACKEND` env var (`local` | `s3`), resolved once into a module-level singleton. No runtime hot-swap.

**Rationale.**
- Preserves the handoff spec's architectural principles (object-storage pattern, signed URLs, `sharp` derivatives) while not running MinIO on the Pi target.
- 70 LOC of interface is cheap insurance against refactoring every server action during a future cloud migration.
- Object keys stay adapter-agnostic (`items/{itemId}/...`) so the same key space works for both backends.

**Options considered.**

1. **Just use the filesystem directly** (Bolt's YAGNI position). Lowest code today; highest refactor cost at cloud-migration time. Rejected because the refactor would touch every server action and route handler that references storage.
2. **Pluggable `StorageAdapter` interface with two implementations** (Neo's position — **accepted**). Tiny abstraction cost, clean migration path.
3. **Ship MinIO inside Docker for F-001** (Pulse's initial position — recanted). Keeps infra parity but costs ~200 MB of RAM on the Pi and adds a second supervised process + network-facing port. Rejected as unnecessary overhead for a single-user LAN deploy.

**Cross-cutting impacts to apply during F-001 construction.**
- **CONSTITUTION.md §1** — "Object storage" row will be updated during F-001 ship to reflect the adapter pattern (rather than "MinIO everywhere").
- **`src/lib/storage/`** — new module (interface file + two impls + signer + config).
- **`src/app/api/images/[key]/route.ts`** — new route handler that validates signed-URL tokens and streams bytes for `LocalDiskStorage`.
- **`.env.example` + `.env.local`** — add `STORAGE_BACKEND`, `STORAGE_LOCAL_DIR`, `IMAGE_URL_SECRET` (≥ 32 bytes).
- **README / CLAUDE.md** — storage section documenting local backend + where photos live on disk.
- **F-019 `self-host-distribution`** — Dockerfile must expose a named volume for the storage directory.

---

### ADR-003 — Derivation queue: in-process `p-queue`

**Status:** Accepted
**Date:** 2026-04-22
**Decided by:** Agent team (Progressive Thinking meeting, F-001 brainstorm, Round 5 Conflict 5.2) — consensus

**Decision.** Sharp derivation (thumb + display variants) runs in an **in-process 2-slot `p-queue`**. No durable queue, no Redis, no worker threads in F-001. Jobs lost on process restart are accepted as v1 tech debt.

**Rationale.** Target is a single-Pi single-process deploy. A durable queue (BullMQ + Redis) is infrastructure overhead that returns nothing until the app goes multi-worker or public.

**Options considered.**
1. **`p-queue`** (Bolt's position — **accepted**). 5 KB, zero deps, in-process. `concurrency: 2` matches the Pi 5 CPU headroom target from Socratic Q4.
2. **BullMQ + Redis** (Neo's position). Survives restarts, scales to N workers. Rejected for F-001 as premature.
3. **Custom `worker_threads`** pool. Unnecessary complexity given sharp's internal threading.

**Migration trigger.** Swap to BullMQ when (a) multi-user goes live via F-006, (b) public hosting is committed, or (c) a second Node process is introduced for any reason. Not before.

**Cross-cutting impacts.**
- Boot-time sweep for stuck `status=pending` rows deferred; will be added when we move off `p-queue`.
- Documented as a "known limitation" in the F-001 shipped README.

---

### ADR-004 — Content-type validation: magic-byte sniff required

**Status:** Accepted
**Date:** 2026-04-22
**Decided by:** Agent team (Progressive Thinking meeting, F-001 brainstorm, Round 5 Conflict 5.1) — Phantom's position accepted

**Decision.** Upload server action must validate uploaded files by **reading magic bytes** (file signature) from the first 8 bytes and rejecting anything that isn't JPEG, PNG, or WebP. The browser-provided `contentType` is never trusted. Rejection happens **before** any bytes reach `StorageAdapter.write()`.

**Rationale.** Browser-supplied MIME is user-controllable — a renamed file can claim any content-type. Sharp's parse-attempt-and-fail would catch most issues as a second layer, but writing 15 MB of non-image bytes before discovering the problem is wasteful and leaves storage artefacts to clean up.

**Implementation.** Hand-rolled 3-signature check (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF ... WEBP`) or the `file-type` npm package (~20 KB). Neo picks during DESIGN.

**Cross-cutting impacts.**
- Acceptance criterion 2 (format allowlist) verified via magic bytes, not content-type string.
- New test case: upload `.jpg` file whose actual bytes are HTML/script → must reject.

<!-- No further finalised decisions yet. -->
