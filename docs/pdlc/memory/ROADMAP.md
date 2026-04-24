# Roadmap

**Project:** Kept
**Last updated:** 2026-04-22

---

## Build Strategy

**Approach:** Layered
**Rationale:** The codebase is already scaffolded from the Claude Design handoff with a working three-view shell (home / browse / detail), Drizzle schema, and server-action CRUD. Features are additive within the established architecture — no tracer slice is needed to prove the stack.

---

## Feature Backlog

| ID | Feature | Description | Priority | Status | Shipped | Episode |
|----|---------|-------------|----------|--------|---------|---------|
| F-001 | `image-upload` | Pluggable storage adapter (local disk / S3-compatible) + `sharp` thumbnails, replacing the striped placeholders. Drives ADR-TBD. | 1 | In Progress | — | — |
| F-002 | `item-edit` | Full item edit form: inline edit of name, subtitle, fields, tags, notes from the detail page. | 2 | Planned | — | — |
| F-014 | `mobile-responsive-pass` | Mobile UX tightening: 44pt touch targets, iOS safe-area-insets, Add Item modal at 375px, home hero stats on narrow screens. | 3 | Planned | — | — |
| F-010 | `mobile-capture` | Mobile-optimised camera-first add flow — phone as the primary capture device. | 4 | Planned | — | — |
| F-019 | `self-host-distribution` | Multi-arch Docker image (ARM64 + x86_64) published to GHCR; `docker-compose.yml` bundling Caddy for LAN HTTPS; optional systemd unit for non-Docker bare-metal installs; "Run Kept on your own device" README. Env-driven config (`DATABASE_URL`, `STORAGE_BACKEND`, `AUTH_PROVIDER`) so the same image serves a Pi at home and a cloud host later. **Absorbs the former F-013 `pi-deploy`.** | 5 | Planned | — | — |
| F-015 | `local-https` | `mkcert` root CA trusted on devices, Caddy terminating TLS in front of Next for `https://kept.local`. Unlocks PWA install + iOS camera APIs. | 6 | Planned | — | — |
| F-016 | `pwa-install` | `manifest.json` + minimal service worker so Kept installs from a browser as a standalone app. Depends on F-015. | 7 | Planned | — | — |
| F-017 | `nightly-backup` | Cron job → `sqlite3 kept.db .backup` to a second disk / NAS / USB drive. | 8 | Planned | — | — |
| F-018 | `health-ping` | `/api/health` endpoint + uptime widget in Tweaks panel. | 9 | Planned | — | — |
| F-003 | `collection-settings` | Edit a collection's name / description / field schema after creation; handle renames of existing field keys on items. | 10 | Planned | — | — |
| F-007 | `search-global` | Cross-collection search from the home masthead (name, tag, field values) via SQLite FTS5. | 11 | Planned | — | — |
| F-008 | `bulk-add` | Import items in bulk — CSV paste or multi-photo drop on a collection. | 12 | Planned | — | — |
| F-009 | `attic-map` | Room / box location tracking — so you can actually find the brass star tree topper in December. | 13 | Planned | — | — |
| F-004 | `onboarding` | First-run empty-state flow: skip demo data, walk a new parent through creating their first collection + item in under a minute. | 14 | Planned | — | — |
| F-005 | `auth` | Single-user password or magic-link auth via Auth.js or Lucia — prerequisite for leaving the home network. | 15 | Planned | — | — |
| F-006 | `multi-user-household` | Partner / family sharing — multiple people on the same collections, with per-item "kept by" metadata. Depends on F-005. | 16 | Planned | — | — |
| F-011 | `insurance-export` | Export a collection (or filtered set) as a printable PDF / CSV for home-insurance documentation. | 17 | Planned | — | — |
| F-012 | `gift-giving-mode` | Private notes per item ("promised to Emma") with a shareable wishlist view. | 18 | Planned | — | — |
| F-020 | `self-host-wizard` | First-run web setup wizard: admin creation, storage location, optional sample data — Nextcloud/Home-Assistant-style. | — | Deferred | — | — |

---

## Status Key

- **Planned** — Not yet started
- **In Progress** — Currently in brainstorm, build, or ship
- **Shipped** — Completed and deployed (date + episode link filled in)
- **Deferred** — Deprioritized or postponed (reason noted)
- **Dropped** — Removed from roadmap (reason noted)

### Deferral notes

- **F-020 `self-host-wizard`** — Deferred until **F-004 `onboarding`** and **F-005 `auth`** ship. A first-run wizard requires both a guided empty state and an admin account model; neither exists yet. Recorded here so the ambition isn't lost.

### Retired IDs

- **F-013 `pi-deploy`** — merged into **F-019** on 2026-04-22. Feature IDs are permanent and never reused; F-013 is intentionally left blank to preserve the sequence.

---

## Open ADRs

None currently open. ADR-TBD (storage backend) resolved as ADR-002 on 2026-04-22 during F-001 brainstorm Progressive Thinking — see `DECISIONS.md`.
