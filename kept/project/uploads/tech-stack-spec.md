# Personal Web App — Technical Stack Specification

## Overview

A full-stack personal web application with relational database CRUD operations. Designed for lightweight personal use on a home network with a clear path to public hosting and scale.

## Stack Summary

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^15.0.0 |
| Language | TypeScript | ^5.4.0 |
| UI Library | React | ^19.0.0 |
| Database (dev) | SQLite via better-sqlite3 | ^11.0.0 |
| Database (prod) | PostgreSQL | 16+ |
| ORM | Drizzle ORM | ^0.36.0 |
| Migrations | drizzle-kit | ^0.28.0 |
| Object storage (dev) | MinIO (S3-compatible) | latest |
| Object storage (prod) | AWS S3 / R2 / any S3-compatible | — |
| S3 client | @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner | ^3.700.0 |
| Image processing | sharp | ^0.33.0 |
| Validation | Zod | ^3.23.0 |
| Styling | Tailwind CSS | ^3.4.0 |
| Component primitives | shadcn/ui (copied in, not a dep) | latest |
| Forms | react-hook-form + @hookform/resolvers | ^7.53.0 |
| Linting | ESLint (Next default config) | ^9.0.0 |
| Formatting | Prettier + prettier-plugin-tailwindcss | ^3.3.0 |
| Package manager | pnpm | ^9.0.0 |
| Runtime | Node.js | 20 LTS or 22 LTS |

## Project Structure

```
/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── (routes)/              # route groups for features
│   │   │   └── items/
│   │   │       ├── page.tsx        # list view
│   │   │       ├── new/page.tsx    # create form
│   │   │       └── [id]/
│   │   │           ├── page.tsx    # detail view
│   │   │           └── edit/page.tsx
│   │   └── api/                    # only when external clients need REST
│   │       └── items/route.ts
│   ├── components/
│   │   ├── ui/                     # shadcn primitives (copied in)
│   │   └── features/               # app-specific components
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts            # db client singleton
│   │   │   ├── schema.ts           # drizzle schema definitions
│   │   │   └── queries.ts          # reusable query helpers
│   │   ├── storage/
│   │   │   ├── client.ts           # S3 client singleton
│   │   │   ├── upload.ts           # presigned URL generation
│   │   │   └── images.ts           # sharp processing helpers
│   │   ├── actions/                # server actions (mutation logic)
│   │   │   └── items.ts
│   │   ├── validators/             # zod schemas
│   │   │   └── items.ts
│   │   └── utils.ts
│   └── types/
├── drizzle/                        # generated migration files
├── public/
├── .env.local                      # DATABASE_URL, etc. (gitignored)
├── .env.example                    # committed template
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Architectural Conventions

**Server-first by default.** Use React Server Components for data fetching. Reserve `"use client"` for components that need interactivity (forms, dropdowns, etc.).

**Mutations via Server Actions.** All create/update/delete operations go through server actions in `src/lib/actions/`. Actions:
1. Validate input with a Zod schema from `src/lib/validators/`.
2. Execute the mutation via Drizzle.
3. Call `revalidatePath()` or `revalidateTag()` to refresh cached data.
4. Return a typed result `{ success: boolean, error?: string, data?: T }`.

**Skip the API layer unless needed.** Don't build `/api/*` routes for the web UI's own consumption — server actions cover that. Add REST endpoints only when an external client (mobile app, CLI, third-party) needs them.

**Database access only in server code.** Never import from `src/lib/db/` in a client component. Wrap query helpers in `src/lib/db/queries.ts` and call them from server components or server actions.

## Database Strategy

**Development:** SQLite file at `./data/dev.db`. Zero setup, fast iteration.

**Production:** PostgreSQL. Drizzle's schema syntax differs slightly between dialects (column types like `text` vs `varchar`, `integer` vs `serial`), so the schema file should be authored against the target dialect from day one if a Postgres migration is planned.

**Recommended approach:** Start with SQLite for the home network deployment. If the app stays on the home network, SQLite is fine indefinitely (a single-file DB on a Pi or NAS handles personal CRUD easily). Migrate to Postgres only when going multi-user or public.

**Schema location:** `src/lib/db/schema.ts`. Export each table and its inferred types:

```ts
export const items = sqliteTable("items", { /* ... */ });
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
```

**Migrations:** Generated via `drizzle-kit generate`, applied via `drizzle-kit migrate`. Commit the `drizzle/` folder.

## Object Storage Strategy

Product photos are stored in S3-compatible object storage, never in the database or local filesystem. The application uses the AWS SDK against an S3-compatible endpoint, so the same code runs against MinIO locally and AWS S3 (or Cloudflare R2, Backblaze B2, etc.) in production.

**Development:** MinIO running in Docker, exposed on `localhost:9000` (API) and `localhost:9001` (web console). Single bucket, no auth complexity beyond root credentials.

**Production:** Any S3-compatible service. Recommended ranking by cost/simplicity for a personal app: Cloudflare R2 (no egress fees, S3 API), Backblaze B2, then AWS S3 itself.

**Migration:** Changing providers means swapping `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `S3_BUCKET` env vars. No code changes.

### Storage Module

`src/lib/storage/client.ts` exports a singleton `S3Client` configured from env vars. Use `forcePathStyle: true` for MinIO compatibility — works with AWS S3 too.

```ts
import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});
```

### Upload Pattern: Presigned URLs

Don't proxy upload bytes through the Next server. Instead:

1. Client requests an upload slot from a server action: `requestUpload({ filename, contentType, size })`.
2. Server validates (file size cap, MIME type allowlist), generates a unique object key (`products/{productId}/{uuid}.{ext}`), and returns a presigned PUT URL via `@aws-sdk/s3-request-presigner` (5-minute expiry).
3. Client `PUT`s the file directly to the presigned URL.
4. Client confirms upload via a second server action that records the object key in the DB and triggers thumbnail generation.

This pattern scales identically from MinIO to S3 and keeps Next server memory free of large file buffers.

### Image Processing

Use `sharp` for server-side image work in a server action or background task:

- Generate thumbnails (e.g., 200px, 800px variants) on upload confirmation.
- Strip EXIF metadata for privacy.
- Convert to WebP or AVIF for delivery efficiency.
- Store derivative keys in the DB (e.g., `original_key`, `thumb_key`, `display_key`).

`sharp` requires a native binary and adds ~10MB to the deployment. If serverless deployment becomes a concern later, consider Cloudflare Image Resizing or imgproxy as a sidecar.

### Database Schema for Images

Don't store binary in the DB. A typical pattern:

```ts
export const productImages = sqliteTable("product_images", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => products.id),
  originalKey: text("original_key").notNull(),
  thumbKey: text("thumb_key"),
  displayKey: text("display_key"),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### Serving Images

For a private home-network app, generate short-lived presigned GET URLs server-side and pass them to `<Image>` components. For public deployment, either keep presigned URLs (simple, slightly higher latency) or make the bucket publicly readable behind a CDN (Cloudflare in front of R2 is the easy path).

Configure `next.config.ts` to allow your storage hostname in `images.remotePatterns` so `next/image` can optimize them.

## Validation Pattern

One Zod schema per entity, colocated in `src/lib/validators/`. Reuse it in three places:

1. Server action input validation.
2. `react-hook-form` resolver via `@hookform/resolvers/zod`.
3. Type inference: `type ItemInput = z.infer<typeof itemSchema>`.

This gives you a single source of truth for shape + validation rules from form to DB.

## Styling Conventions

Tailwind utility classes inline. No CSS modules, no styled-components. Use shadcn/ui's CLI to copy primitive components (Button, Input, Dialog, etc.) into `src/components/ui/` — these are owned code, not a dependency, so they're freely customizable and never go stale on you.

## Environment Variables

```
# .env.example
DATABASE_URL="file:./data/dev.db"           # sqlite dev
# DATABASE_URL="postgresql://user:pass@host:5432/dbname"  # postgres prod

# Object storage — same vars work for MinIO, S3, R2, B2
S3_ENDPOINT="http://localhost:9000"          # MinIO local; omit or set to AWS endpoint in prod
S3_REGION="us-east-1"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="product-photos"
S3_PUBLIC_URL="http://localhost:9000"        # base URL for serving (may differ from endpoint behind a CDN)

NODE_ENV="development"
```

Validate env vars at startup with a Zod schema in `src/lib/env.ts` so missing or malformed values fail loudly on boot, not at first request.

## Scripts (package.json)

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "format": "prettier --write .",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

## Local Development Services

Run MinIO (and optionally Postgres) via Docker Compose. Save as `docker-compose.dev.yml`:

```yaml
services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"      # S3 API
      - "9001:9001"      # web console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - ./data/minio:/data
    command: server /data --console-address ":9001"

  # Uncomment when migrating off SQLite
  # postgres:
  #   image: postgres:16-alpine
  #   ports:
  #     - "5432:5432"
  #   environment:
  #     POSTGRES_USER: app
  #     POSTGRES_PASSWORD: app
  #     POSTGRES_DB: app
  #   volumes:
  #     - ./data/postgres:/var/lib/postgresql/data
```

Start with `docker compose -f docker-compose.dev.yml up -d`. Visit `http://localhost:9001` to create the `product-photos` bucket through the MinIO console (or do it programmatically on app startup).

## Deployment Targets

**Home network (initial):** `pnpm build && pnpm start` on the host machine, or containerize with a multi-stage Dockerfile based on `node:22-alpine`. Reverse proxy via Caddy or nginx if needed for HTTPS.

**Public hosting (later):** Vercel for zero-config deploys, or self-host the same Docker image on any VPS. Switch DATABASE_URL to a managed Postgres (Neon, Supabase, Railway) when migrating off SQLite.

## Migration Escape Hatches

The stack is deliberately structured so each layer can be replaced independently:

- React components in `src/components/` work in any React framework (Remix, Vite + React Router, TanStack Start).
- Drizzle schema and queries are framework-agnostic — they'd work in Hono, Express, Fastify, or any Node backend.
- Zod schemas are pure TypeScript and portable anywhere.
- Tailwind classes survive any framework change.
- Object storage code uses the standard S3 API — MinIO, AWS S3, Cloudflare R2, Backblaze B2, and Wasabi are all drop-in interchangeable.

The only real lock-in is server actions and Next-specific routing conventions, both of which are mechanical (not conceptual) to port.

## Out of Scope for v1

- Authentication (add Auth.js / Lucia / Clerk when needed)
- Background jobs (add when needed; consider Trigger.dev or a cron endpoint)
- File uploads (add Uploadthing or S3-compatible storage when needed)
- Email (add Resend or similar when needed)
- Observability (add Sentry / OpenTelemetry when going public)

Each of these slots in cleanly without restructuring the app.
