# Kept — Design → Engineering Handoff

This folder contains everything needed to turn the `Kept.html` design prototype into a
Next.js + Drizzle + S3 app per the engineering tech stack spec.

The prototype is a React design artifact. Treat it as the **visual + interaction
reference**. All the data shapes, validators, and a starter Drizzle schema live
in this folder and are ready to drop into `src/lib/...` in the real codebase.

---

## Files in this folder

| File | Purpose | Drops into |
|---|---|---|
| `HANDOFF.md` | This document. Maps design decisions to code locations. | — |
| `schema.ts` | Drizzle SQLite schema for `collections`, `items`, `item_images`, `tags`, `item_tags`. Author against SQLite for dev; adjust types for Postgres when migrating. | `src/lib/db/schema.ts` |
| `validators.ts` | Zod schemas for every form in the UI (new collection, new item). Reuse for server-action input + react-hook-form resolvers. | `src/lib/validators/kept.ts` |
| `types.ts` | Shared types the UI consumes. Inferred from schema + validators. | `src/types/kept.ts` |
| `routes.md` | Route map from the prototype's in-memory router to Next.js App Router paths. | — |
| `server-actions.md` | Every mutation in the UI, mapped to a named server action + its Zod input. | — |
| `image-pipeline.md` | How the UI expects photo upload / display to work against presigned S3 URLs. | — |

---

## Design invariants (things engineering shouldn't change)

1. **Collection** (previously "catalog" in some copy — spec uses `items`/features,
   UI uses **Collection**) is the top-level grouping. Each collection has a
   user-defined schema of fields (see `schema.ts#collections.fields`).
2. **Custom fields are per-collection, not per-item.** On `items`, extra field
   values live in a `fieldValues` JSON column keyed by the collection's field
   names. No Postgres `jsonb` magic — just stringified JSON, decoded in the
   query helper. Switch to `jsonb` when moving to Postgres.
3. **Tags are free-form strings.** Normalise on write (lowercase + trim) but
   store as an `item_tags` join, not a stringified column. This is what the
   search/filter UI in Browse view expects.
4. **Photos are NOT in the DB.** `item_images` stores S3 object keys only.
   See `image-pipeline.md`.
5. **Item IDs are short, URL-safe, human-readable** (e.g. `snk-01`, `dec-04`)
   — not UUIDs. The UI renders the ID in the detail view as `ITEM ID` metadata.
   Use nanoid(8) with a collection-prefix, or a simple `${collectionSlug}-${n}` scheme.
6. **Route state persists to `localStorage`** in the prototype (`kept_route`,
   `kept_tweaks`). In the real app this is handled by Next routing; tweaks
   should still persist to localStorage or a user preferences table.

---

## Prototype → codebase file map

| Prototype | Production |
|---|---|
| `HomeInventory.html` → `Kept.html` | `src/app/layout.tsx` + routed pages |
| `app/HomeView.jsx` | `src/app/page.tsx` (home) |
| `app/BrowseView.jsx` | `src/app/collections/[id]/page.tsx` |
| `app/DetailView.jsx` | `src/app/items/[id]/page.tsx` |
| `app/Overlays.jsx`   | `src/components/features/{AddItemDialog,NewCollectionDialog,TweaksPanel}.tsx` |
| `app/components.jsx` | `src/components/ui/ItemPhoto.tsx`, `Tag.tsx`, `Icons.tsx` |
| `app/data.js`        | Seed file at `drizzle/seed.ts` |
| `app/styles.css`     | `src/app/globals.css` + Tailwind tokens in `tailwind.config.ts` (see "Design tokens" below) |

---

## Design tokens → Tailwind

The prototype defines everything in CSS custom properties in `app/styles.css`.
Port these to `tailwind.config.ts` `theme.extend.colors` and CSS vars in
`globals.css` so the three theme variants (`paper`, `ink`, `gallery`) can be
toggled via a `data-theme` attribute on `<html>`.

```ts
// tailwind.config.ts — extend section
colors: {
  paper: "oklch(var(--paper) / <alpha-value>)",
  "paper-2": "oklch(var(--paper-2) / <alpha-value>)",
  ink: "oklch(var(--ink) / <alpha-value>)",
  "ink-2": "oklch(var(--ink-2) / <alpha-value>)",
  "ink-3": "oklch(var(--ink-3) / <alpha-value>)",
  rule: "oklch(var(--rule) / <alpha-value>)",
  "rule-strong": "oklch(var(--rule-strong) / <alpha-value>)",
  accent: "oklch(var(--accent) / <alpha-value>)",
},
fontFamily: {
  serif: ["Libre Caslon Text", "Cormorant Garamond", "Georgia", "serif"],
  sans: ["Geist", "Söhne", "system-ui", "sans-serif"],
  mono: ["JetBrains Mono", "ui-monospace", "monospace"],
},
```

See `app/styles.css` for the exact OKLCH values for each variant; copy them
verbatim into `globals.css`.

---

## shadcn mapping

| UI element | shadcn primitive |
|---|---|
| Modal overlays (`AddItemModal`, `NewCatalogModal`) | `Dialog` |
| Catalog select in Add Item | `Select` |
| Form inputs | `Input`, `Label` |
| Toolbar "New item" button | `Button` |
| Tag pills in Browse | `Badge` (with custom `variant="outline"` styling to match) |
| Toast on save | `Sonner` / `Toast` |

---

## What engineering should NOT port

- The inline `<script type="text/babel">` + `window.__openItem` global indirection — that's prototype scaffolding only.
- The striped-gradient `ItemPhoto` placeholder — replace with `<Image>` once real uploads exist. Keep as a fallback when `item.photo` is null.
- The `TWEAK_DEFAULTS` `/*EDITMODE-BEGIN*/` block — prototype-only edit-mode affordance.
- The `kept_route` localStorage state — Next routing replaces it entirely.
