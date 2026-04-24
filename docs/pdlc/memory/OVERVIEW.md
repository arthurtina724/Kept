# Overview
<!-- pdlc-template-version: 2.1.0 -->
<!-- This file is the living, aggregated record of everything this product does and has shipped.
     It is updated automatically by PDLC after every successful merge to main (during Reflect sub-phase).
     Use it to orient yourself after time away, onboard a new teammate, or brief Claude in a fresh session.
     Do not edit manually — let PDLC maintain it. If you need to correct something, update and note the reason. -->

**Project:** Kept
**Last updated:** 2026-04-22T00:00:00Z

---

## Project Summary

Kept is a personal archive for the things worth keeping in a home — heirlooms, seasonal decor, wardrobes, collections — built for busy parents who want an editorial, photo-first library rather than a spreadsheet or warehouse-management tool.

---

## Active Functionality

<!-- Present-state functionality available in the codebase on main as of 2026-04-22.
     This reflects pre-init scaffolding carried over from the Claude Design handoff,
     not yet a shipped PDLC feature. -->

- Browse three seeded collections (Sneakers, Christmas Decor, Clothing) from the home dashboard.
- Open any collection to see a Pinterest-style masonry of its items with live search and tag filtering.
- Open any item to see a detail page with a gallery, editable fields grid, tags, notes, and duplicate / delete actions.
- Add a new item via a collection-aware modal (fields adapt to the selected collection's schema).
- Create a new collection via a two-step modal (name/description → field chip grid).
- Switch between `paper`, `ink`, and `gallery` themes via the Tweaks panel (persisted to `localStorage`, no flash on reload).

Image upload is stubbed — the photo-drop UI is visible but the S3 / MinIO pipeline is not yet wired.

---

## Shipped Features

| # | Feature | Date Shipped | Episode | PR |
|---|---------|-------------|---------|-----|
<!-- No features shipped via PDLC yet. -->

---

## Architecture Summary

- Next.js 15 App Router (React 19, TypeScript strict) served as a single Node process; prod build via `npm run build`.
- SQLite via `better-sqlite3` in dev (file at `./data/dev.db`), Drizzle ORM as the query layer. Schema + migrations in `src/lib/db/` and `drizzle/`. Postgres is the planned prod target — same Drizzle schema with dialect swap.
- All mutations go through Server Actions in `src/lib/actions/kept.ts` — each validates input with a Zod schema from `src/lib/validators/kept.ts`, runs the Drizzle mutation, and calls `revalidatePath()` for affected routes.
- Styling: Tailwind CSS for utilities + a small set of prototype-derived component classes in `src/app/globals.css`. Three theme variants (`paper`, `ink`, `gallery`) toggle via `data-theme` on `<html>`; an inline script in `layout.tsx` reads `localStorage.kept_tweaks` pre-hydration to prevent flash.
- Object storage: S3-compatible (MinIO locally, S3 / R2 / B2 in prod) with presigned-URL uploads and `sharp` thumbnail derivation — **not yet wired** in v1; striped-gradient placeholders render in place of photos.
- CI/CD: not yet configured. Pulse will scaffold this at the first `/pdlc ship`.

---

## Known Tech Debt

- [Added 2026-04-22] Image upload pipeline (MinIO/S3 + sharp + presigned URLs) is stubbed — `AddItemDialog` shows the photo-drop UI but does not upload. Accepted to ship the visual + CRUD layer first — ep-TBD will wire it up.
- [Added 2026-04-22] No authentication — intentional for v1 per INTENT.md. Add Auth.js / Lucia / Clerk when multi-user becomes real.
- [Added 2026-04-22] No tests yet — unit tests are not a required gate per CONSTITUTION §7, but the required Integration + Visual Regression gates also have no harness yet. First Construction phase must stand up the test runner before `npm run test` becomes meaningful.

---

## Decision Log Summary

<!-- See docs/pdlc/memory/DECISIONS.md for the full log. -->

- Tech stack locked to the handoff bundle's spec: Next.js 15 + React 19 + TypeScript + Drizzle + SQLite → Postgres + Tailwind + Zod + S3-compatible object storage. See CONSTITUTION §1.
- Required test gates: Integration + Visual Regression (not Unit). User does functional UI testing; integration tests protect the frontend ↔ server-action boundary.
