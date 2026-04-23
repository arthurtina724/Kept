# Intent
<!-- pdlc-template-version: 2.1.0 -->
<!-- This file defines the core purpose of the product.
     It is set during /pdlc init and should rarely change.
     If the fundamental problem or user changes, update this file and record why in docs/pdlc/memory/DECISIONS.md.
     Claude reads this at the start of every Inception phase to anchor the Discover conversation. -->

**Project:** Kept
**Created:** 2026-04-22
**Last updated:** 2026-04-22

---

## Project Name

Kept — a personal archive for the things worth keeping in your home.

---

## Problem Statement

Busy households accumulate a lot of meaningful stuff — heirlooms, seasonal decor, wardrobes, gear, collections — and the tools people reach for to track it (spreadsheets, asset-management apps, warehouse software) feel clinical and joyless. That friction means most of what's in a home is never catalogued at all, and the things that *are* catalogued quickly go stale because the experience of maintaining them feels like data entry. The gap between "no system" and "enterprise inventory software" is where families live, and it is underserved.

---

## Target User (Persona)

**Primary: The Busy Parent / Household Manager**

- Parents juggling work, kids, and the day-to-day of running a household.
- Want to know what they own, where it is, and remember the stories behind things that matter — without turning their evenings into data entry.
- Frustrated by apps that look like accounting software or warehouse management tools; want something that feels personal and editorial, not industrial.
- Will use a tool that reduces friction to under a minute per item and makes the library itself feel worth revisiting.

**Secondary users (if any):**

<!-- Likely candidates for v2+: partners sharing a household library, family members tagging along on holiday-decor setup, insurance documentation use cases. Not committed in v1. -->

---

## Core Value Proposition

Only Kept lets a busy parent catalog the things they want to remember in a way that feels like leafing through a family album — collection-first, photo-forward, editorial — instead of filling out a spreadsheet.

---

## What Success Looks Like

<!-- Placeholder — refine during Inception of the first feature.
     Likely early metrics: time-to-first-item, items-per-session, return-within-7-days,
     number of collections created, average fields per collection. -->

| Metric | Target | Timeframe |
|--------|--------|-----------|
| <!-- metric --> | <!-- target --> | <!-- 30 days post-launch --> |
| <!-- metric --> | <!-- target --> | <!-- timeframe --> |
| <!-- metric --> | <!-- target --> | <!-- timeframe --> |

---

## Out of Scope

<!-- Confirmed via handoff + tech-stack-spec.md "Out of Scope for v1" section. -->

- Authentication — not in v1 (will add Auth.js / Lucia / Clerk when multi-user matters).
- Multi-user / team / shared-household accounts — not in v1.
- Background jobs infrastructure — not in v1.
- Email notifications / weekly digests — not in v1.
- Public marketplace or social features — not in v1.

---

## Key Constraints

- **Feel** is a hard constraint: Kept must not feel like a spreadsheet, CRM, or warehouse app at any point in the UI.
- **Deploy surface** is TBD — initial target is home-network / single-user (SQLite on a Pi or NAS is viable); public hosting comes later and switches `DATABASE_URL` to managed Postgres (Neon / Supabase / Railway).
- **Image storage** must use an S3-compatible API from day one (MinIO local, S3 / R2 / B2 in prod) — no binary in the DB, ever.
- **Friction budget** for adding an item must stay under ~60 seconds including a photo upload.
