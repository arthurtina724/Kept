# Kept

A personal inventory app. Built from the `kept/` handoff bundle per the tech stack spec: Next.js 15 (App Router, React 19) + Drizzle ORM + SQLite (dev) + Tailwind.

## Quick start

```bash
npm install
npm run db:generate   # creates drizzle migration (already committed — safe to skip)
npm run db:migrate    # applies migrations to ./data/dev.db
npm run db:seed       # loads the prototype's sample collections + items
npm run dev           # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server on :3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run db:generate` | Regenerate SQL migrations from `src/lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the SQLite file |
| `npm run db:seed` | Clear + re-seed with prototype data (21 items, 3 collections) |
| `npm run db:studio` | Open Drizzle Studio against the dev DB |

## Layout

```
src/
  app/
    layout.tsx, globals.css, page.tsx, not-found.tsx
    collections/[id]/page.tsx   # Browse
    items/[id]/page.tsx         # Detail
  components/
    ui/          Masthead, Icons, Tag, ItemPhoto
    features/    AddItemDialog, NewCollectionDialog, TweaksPanel,
                 BrowseGrid, DetailGallery, ItemActions
  lib/
    db/          schema.ts, index.ts, queries.ts, migrate.ts, seed.ts
    actions/     kept.ts (server actions: createCollection, createItem,
                 updateItem, deleteItem, duplicateItem)
    validators/  kept.ts (Zod schemas — shared server + client)
    placeholder.ts, utils.ts
  types/kept.ts
drizzle/          Generated SQL migrations
```

## What works

- Home page with hero stats, mosaic collection cards, and "Recently kept" masonry.
- Browse view with live search + tag filtering (client state) over server-fetched items.
- Detail view with mocked 4-tile thumbnail gallery, fields grid, tags, duplicate/delete actions.
- Add item modal — collection picker auto-adapts fields to the selected collection's schema.
- New collection two-step modal (name/description → field chip grid).
- Tweaks panel: `paper` / `ink` / `gallery` themes via `data-theme` on `<html>`, persisted to `localStorage`. Pre-hydration inline script prevents flash.

## What's stubbed

Per the handoff, the design prototype uses striped-gradient placeholders as the intentional "no photo yet" affordance — that's what this build renders. The S3/MinIO + sharp upload pipeline is not wired up yet; the Add Item dialog shows the photo-drop UI but won't POST a file. See `kept/project/handoff/image-pipeline.md` for the full flow to implement.

To add uploads:

1. Run MinIO via `docker compose -f docker-compose.dev.yml up -d` (add the compose file from `kept/project/uploads/tech-stack-spec.md`).
2. Add `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp` to `package.json`.
3. Implement `src/lib/storage/{client,upload,images}.ts` and add `requestUpload` / `confirmUpload` / `deleteImage` server actions to `src/lib/actions/kept.ts`.
4. Wire the `photo-drop` element in `AddItemDialog` to request a presigned URL, `PUT` the file, then call `confirmUpload`.

## Design invariants preserved

- Collections own a user-chosen `fields` list. Item field values are stored as JSON keyed by those names.
- Tags are free-form, normalised (lowercase + trim), scoped per-collection, stored via `item_tags` join.
- Item IDs are short + human-readable (`snk-01`, `dec-04`). New items get `${collectionPrefix}-${N}` where prefix is the first 3 chars of the collection id.
- Theme tokens ported verbatim from `styles.css` as CSS variables; three variants toggle via `data-theme` on `<html>`.
- `localStorage` key for tweaks: `kept_tweaks`.

## Migrating to Postgres

Swap `sqliteTable` → `pgTable` in `schema.ts`, `integer({ mode: "timestamp" })` → `timestamp`, and `text({ mode: "json" })` → `jsonb`. Update `drizzle.config.ts` dialect and `src/lib/db/index.ts` to use `drizzle-orm/postgres-js` or `drizzle-orm/node-postgres`. Set `DATABASE_URL` to a Postgres connection string.
