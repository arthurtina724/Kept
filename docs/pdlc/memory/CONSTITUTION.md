# Constitution
<!-- pdlc-template-version: 2.1.0 -->
<!-- This file is the single source of truth for how this project is built.
     PDLC reads it before every phase. Strong defaults are already set.
     Override only what your team explicitly agrees to change.
     Changing this file is a Tier 2 safety event — PDLC will pause and confirm. -->

**Version:** 1.0.0
**Last updated:** 2026-04-22
**Project:** Kept

---

## 1. Tech Stack Decisions

<!-- Locked in from /pdlc init based on the handoff bundle's tech-stack-spec.md. -->

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | TypeScript 5 (strict mode) | Type safety across server + client boundary |
| Runtime / Framework | Node.js 22 LTS, Next.js 15 (App Router), React 19 | Server-first SSR, file-based routing, React Server Components |
| Database (dev) | SQLite via better-sqlite3 | Zero-setup local dev, single-file DB |
| Database (prod) | PostgreSQL 16+ | Relational, battle-tested; migration path planned |
| ORM / Query layer | Drizzle ORM | Lightweight, type-safe, dialect-portable |
| Styling | Tailwind CSS 3.4 + design tokens in CSS vars | Utility-first with OKLCH theme tokens (paper/ink/gallery variants) |
| Auth | <!-- not in v1 — add Auth.js / Lucia / Clerk when needed --> | — |
| Validation | Zod 3 | Single source of truth: server action input, react-hook-form resolver, type inference |
| Object storage | MinIO (dev) / S3-compatible (prod) | Presigned URL upload pattern; sharp for thumbnails — stubbed in v1 |
| Testing | <!-- TBD — see Section 7 --> | — |
| Hosting / Deploy | <!-- TBD — Pulse will help during /pdlc ship --> | — |
| CI/CD | <!-- not yet configured — Pulse will scaffold --> | — |

---

## 2. Coding Standards & Style

### Linting & Formatting

- Linter: ESLint (Next default config) — configure `.eslintrc.json` when first lint rule is adjusted
- Formatter: Prettier + `prettier-plugin-tailwindcss` — configure `.prettierrc` when needed
- Pre-commit hook: <!-- none yet — add lint-staged + husky when first lint violation lands -->

### Naming Conventions

| Construct | Convention | Example |
|-----------|-----------|---------|
| Files (components) | PascalCase | `ItemPhoto.tsx` |
| Files (utilities) | kebab-case or camelCase | `placeholder.ts`, `utils.ts` |
| Variables / functions | camelCase | `getItemWithRelations` |
| Constants | SCREAMING_SNAKE_CASE | `AVAILABLE_FIELDS` |
| Types / Interfaces | PascalCase, no I-prefix | `ItemWithRelations` |
| Database tables | snake_case, plural | `item_images`, `item_tags` |
| Database columns | snake_case | `created_at`, `collection_id` |
| CSS classes | Utility classes (Tailwind) + a small set of prototype-derived component classes in `globals.css` (`.app`, `.masthead`, `.hero`, `.catalog-card`, etc.) | — |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `S3_BUCKET` |
| Branch names | `feature/[kebab-case]` | `feature/image-upload-pipeline` |

### General Rules

- No `any` in TypeScript without an explicit justification comment
- No `console.log` / debug statements in committed code
- Do not import from `src/lib/db/` in a client component — DB access is server-only
- Default to writing no comments; explain **why**, not **what**, only when non-obvious

---

## 3. Architectural Constraints

<!-- These are guardrails — not preferences. Agents must flag deviations. -->

- **Server-first by default.** Data fetching happens in React Server Components. `"use client"` is only used for components that need interactivity (forms, dropdowns, modal state, theme toggles).
- **Mutations via Server Actions only.** All create/update/delete operations go through server actions in `src/lib/actions/`. Each action: (1) validates input with a Zod schema from `src/lib/validators/`, (2) executes via Drizzle, (3) calls `revalidatePath()` for affected routes, (4) returns `ActionResult<T>`.
- **No `/api/*` routes unless an external client needs them.** Server actions cover the web UI's own mutation needs.
- **Database access is server-only.** Never import from `src/lib/db/` in a client component. Wrap query helpers in `src/lib/db/queries.ts` and call them from server components or server actions.
- **One Zod schema per entity**, colocated in `src/lib/validators/`. Reused for server action input validation, react-hook-form resolvers, and type inference (`z.infer<...>`).
- **Photos are S3 object keys only — never binary in the DB.** The `item_images` table stores keys; presigned URLs are generated server-side and passed to the UI.

---

## 4. Security & Compliance Requirements

- OWASP Top 10 must be checked before any feature ships (Phantom runs this during Review)
- All user input validated at the service boundary via Zod schemas
- Secrets never in source or logs — environment variables only
- Dependencies audited via `npm audit` before each release (baseline: 1 high, 4 moderate as of 2026-04-22 — pre-existing)
- HTTPS enforced in all non-local environments
- Presigned upload URLs must be short-lived (≤5 minutes) and size-capped (20 MB per image)
- Strip EXIF metadata from uploaded images before serving

---

## 5. Definition of Done

- [ ] Code is committed on the feature branch with a conventional commit message
- [ ] Integration tests pass (required gate — see Section 7)
- [ ] Visual regression tests pass (required gate — see Section 7)
- [ ] Code has been reviewed by Neo, Echo, Phantom, and Jarvis
- [ ] Review file (`docs/pdlc/reviews/REVIEW_*.md`) exists and is human-approved
- [ ] No `console.log` / debug statements left in committed code
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] `npm run build` succeeds
- [ ] Linter passes with zero errors
- [ ] PR description is complete and references the Beads task ID
- [ ] Episode file drafted and human-approved

---

## 6. Git Workflow Rules

### Branch Strategy

- **Feature branch model (default)**: One branch per feature (`feature/[feature-name]`), single PR to `main` at end of Construction.

**Default branch:** `main`
**Feature branch naming:** `feature/[kebab-case-feature-name]`
**Merge strategy:** Merge commit (preserves full branch history)

### Commit Message Format

Format: `<type>(<scope>): <description>`

Types: `feat` | `fix` | `chore` | `docs` | `test` | `refactor` | `perf` | `ci`

Examples:
- `feat(collections): add collection settings page`
- `fix(items): respect field-value ordering on detail view`
- `test(actions): cover createItem with collection schema mismatch`

**Breaking changes:** append `!` after type, e.g. `feat(schema)!: rename collection.fields to collection.attributes`

### Protected Branches

- `main` — requires PR + human approval

---

## 7. Test Gates

<!-- User chose during /pdlc init: Integration + Visual Regression as required gates.
     Unit tests are not a required gate — the user does functional testing in the UI.
     Integration tests protect the frontend ↔ server-action boundary. -->

- [ ] Unit tests
- [x] Integration tests
- [ ] E2E tests (real Chromium)
- [ ] Performance / load tests
- [ ] Accessibility checks
- [x] Visual regression tests
- [x] Security scan (dependency audit + secret scan — always required, cannot be unchecked)

### Custom Test Layers

| Name | Command | Required |
|------|---------|----------|
<!-- Add rows here as the stack matures -->

---

## 8. Safety Guardrail Overrides

<!-- User chose "none" during /pdlc init — all Tier 2 actions keep their pause-and-confirm behaviour. -->

| Tier 2 Item | Downgraded Reason | Date Agreed | Agreed By |
|-------------|-------------------|-------------|-----------|
| — | — | — | — |

---

## 9. Context & Model Configuration

**Context window (tokens):** 1000000

**Warning threshold:** 50
**Critical threshold:** 65

**Distill threshold (tokens):** 800

---

## 10. Additional Rules

- Theme variants toggle via `data-theme` attribute on `<html>`, persisted to `localStorage` key `kept_tweaks`. Pre-hydration inline script must run before body renders to prevent flash.
- Item IDs are short + human-readable (`${collectionPrefix}-${NN}`) — not UUIDs. First 3 chars of collection id + zero-padded serial.
- Tags normalised (lowercase + trim) on write. Scoped per-collection via `item_tags` join — "og" in Sneakers is a different tag than "og" in another collection.
- Collection field schemas are user-defined (per collection) and stored as a JSON array; item field values live in a `field_values` JSON column keyed by those field names.
