# Kept

<!-- pdlc-expanded: true — Updated with architecture and design context from F-001 design approval. Actuals replace planned content after first ship. -->

Kept is a personal archive for busy parents who want to remember the things they keep in their home — heirlooms, decor, wardrobes, collections — in a way that feels like an editorial photo album, not a spreadsheet or warehouse-management system.

## Tech Stack

- **Language:** TypeScript 5 (strict mode)
- **Framework:** Next.js 15 (App Router, React 19), Server Actions for mutations
- **Database:** SQLite (dev, via `better-sqlite3`) → PostgreSQL (prod); Drizzle ORM
- **Styling:** Tailwind CSS 3.4 + OKLCH theme tokens (paper / ink / gallery)
- **Validation:** Zod (single source of truth for server actions + forms + types)
- **Key libraries (from F-001 design):** `sharp` (image derivation), `p-queue` (concurrency control), `nanoid` (short ids), `jose` or hand-rolled HMAC (signed URLs), `file-type` pattern for magic-byte sniffing
- **Storage:** pluggable `StorageAdapter` — `LocalDiskStorage` for dev/Pi, `S3Storage` stub until public hosting is committed

## Development

Package manager: **pnpm** (pinned via `packageManager` field; Corepack auto-activates the right version).

- **Install:** `pnpm install`
- **Migrate + seed:** `pnpm run db:migrate && pnpm run db:seed`
- **Dev server:** `pnpm dev` (http://localhost:3000)
- **Build:** `pnpm build`
- **Test:** `pnpm test` (vitest; not yet scaffolded — lands in F-001 Plan sub-phase)
- **Drizzle studio:** `pnpm run db:studio`

## Architectural Constraints

- **Server-first by default.** Data fetching happens in React Server Components; `"use client"` only when interactivity is required.
- **Mutations via Server Actions only.** Each action validates input with a Zod schema in `src/lib/validators/`, runs the Drizzle mutation, calls `revalidatePath()`, and returns `ActionResult<T>`.
- **No `/api/*` routes** unless an external client needs them — server actions cover the web UI. F-001's `/api/images/[key]` is the single documented exception (image bytes are served to `<img>` tags, which cannot call Server Actions).
- **Database access is server-only.** Never import from `src/lib/db/` in a client component. Every file in `src/lib/{storage,derivation,images}/*` begins with `import "server-only"`.
- **One Zod schema per entity** in `src/lib/validators/`, reused for server-action validation, form resolvers, and type inference.
- **Photos are object keys only — never binary in the DB.**
- **EXIF is stripped on originals** before any disk write. No file in storage contains EXIF metadata.

Full detail: `docs/pdlc/memory/CONSTITUTION.md`.

## Project Structure

<!-- update after first build -->

```
src/
├── app/                         # Next.js App Router — pages + layouts + one API route
│   ├── page.tsx                 # Home (server component)
│   ├── collections/[id]/        # Browse view per collection
│   ├── items/[id]/              # Item detail
│   └── api/images/[key]/        # Signed-URL image serving (F-001)
├── components/
│   ├── ui/                      # ItemPhoto, Tag, Icons, Masthead, PhotoDropZone (F-001)
│   └── features/                # AddItemDialog, BrowseGrid, DetailGallery, TweaksPanel, NewCollectionDialog, ItemActions
├── lib/
│   ├── actions/                 # Server Actions — mutation entry points
│   │   ├── kept.ts              # Collection + item CRUD
│   │   └── photos.ts            # Photo upload/delete (F-001)
│   ├── validators/              # Zod schemas
│   ├── db/                      # Drizzle: schema.ts, queries.ts, migrate.ts, seed.ts
│   ├── storage/                 # F-001 — StorageAdapter interface + LocalDiskStorage + S3 stub + signer
│   ├── derivation/              # F-001 — in-process p-queue (concurrency: 2)
│   ├── images/                  # F-001 — sharp pipeline, magic-byte validate, key-path builder
│   ├── placeholder.ts           # Striped-gradient fallback rendering
│   ├── utils.ts
│   └── log.ts                   # F-001 — tiny structured-log helper
└── types/kept.ts                # Shared types (re-exports from schema + validators)

docs/pdlc/                        # PDLC memory, brainstorms, PRDs, design docs, episodes
drizzle/                          # Generated migrations
data/                             # Local SQLite + image storage (gitignored)
```

## Architecture

<!-- update after first build -->

Kept is a monolithic Next.js 15 App Router app. React Server Components fetch from Drizzle + SQLite directly; client interactivity is confined to dialogs, drop zones, and the tweaks panel. All writes flow through Server Actions that validate with Zod, mutate via Drizzle, call `revalidatePath()`, and return `ActionResult<T>`.

F-001 image-upload introduces five new server-side modules (`storage/`, `derivation/`, `images/`, new `actions/photos.ts`, new `api/images/[key]/route.ts`) with one-way dependencies: actions orchestrate, derivation runs async via in-process `p-queue`, storage is a pluggable adapter behind an interface. Photos are EXIF-stripped before any disk write; signed URLs use HMAC-SHA256 over `IMAGE_URL_SECRET` with ~60s TTL.

Full architecture: `docs/pdlc/design/image-upload/ARCHITECTURE.md`.

## Coding Conventions

- **Files (components):** `PascalCase.tsx` (e.g. `ItemPhoto.tsx`). **Files (utilities):** `kebab-case.ts` or `camelCase.ts`.
- **Variables / functions:** `camelCase`. **Constants:** `SCREAMING_SNAKE_CASE`. **Types / Interfaces:** `PascalCase`, no `I` prefix.
- **Database:** tables `snake_case_plural` (`item_images`), columns `snake_case` (`created_at`).
- **Env vars:** `SCREAMING_SNAKE_CASE` (`DATABASE_URL`, `IMAGE_URL_SECRET`).
- **Branches:** `feature/[kebab-case-feature-name]`.
- **Import hygiene:** every file in `src/lib/{db,storage,derivation,images,actions}/*` starts with `import "server-only"` to enforce the server/client boundary at build time.
- **Error handling:** Server Actions return `ActionResult<T> = { success: true, data: T } | { success: false, error: string, code?: string }`. Never throw across the action boundary to the client.
- **No `any`** without an explicit justification comment. **No `console.log`** in committed code — use the structured `log()` helper.
- **Comments:** default to none. Only when the *why* is non-obvious.

## Key Files

<!-- update after first build -->

- `src/app/layout.tsx` — root layout, loads theme tokens, pre-hydration script for `data-theme` attribute.
- `src/app/globals.css` — OKLCH theme tokens (paper / ink / gallery), component classes ported verbatim from the handoff prototype.
- `src/lib/db/schema.ts` — Drizzle schema: `collections`, `items`, `item_images`, `tags`, `item_tags` + relations.
- `src/lib/db/queries.ts` — `getHomeData`, `getCollection`, `getItemWithRelations`, `getRelatedItems`.
- `src/lib/actions/kept.ts` — `createCollection`, `createItem`, `updateItem`, `deleteItem`, `duplicateItem`.
- `src/lib/actions/photos.ts` — (F-001) `uploadPhoto`, `deletePhoto` (stub).
- `src/lib/validators/kept.ts` — Zod schemas for every form + action.
- `src/lib/storage/adapter.ts` — (F-001) `StorageAdapter` interface.
- `src/lib/storage/local-disk.ts` — (F-001) real adapter implementation.
- `src/lib/derivation/queue.ts` — (F-001) p-queue singleton, concurrency: 2.
- `src/lib/images/pipeline.ts` — (F-001) sharp workflow: EXIF strip, orient, resize variants.
- `src/app/api/images/[key]/route.ts` — (F-001) signed-URL-gated image serving.
- `drizzle.config.ts` / `next.config.ts` / `tailwind.config.ts` — framework config.
- `docs/pdlc/memory/CONSTITUTION.md` — non-negotiable project rules (tech stack, test gates, git workflow).
- `docs/pdlc/memory/DECISIONS.md` — ADR registry (ADR-001 pnpm, ADR-002 StorageAdapter, ADR-003 p-queue, ADR-004 magic-byte sniffing).
