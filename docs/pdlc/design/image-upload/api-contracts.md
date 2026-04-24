# API Contracts — image-upload (F-001)

**PRD:** [../../prds/PRD_image-upload_2026-04-22.md](../../prds/PRD_image-upload_2026-04-22.md)
**Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
**Data model:** [data-model.md](data-model.md)
**Status:** Draft (awaiting user approval)

---

## 1. Summary of surfaces

F-001 introduces:

- **Two new Server Actions** (`uploadPhoto`, `deletePhoto` stub) — the canonical mutation path.
- **One new HTTP route** (`GET /api/images/[key]`) — the sole exception to Kept's "no API routes" rule, necessary because `<img src="...">` is an external consumer that cannot call a Server Action.
- **One revised Zod schema set** — `uploadPhotoSchema` replaces the removed `requestUploadSchema` + `confirmUploadSchema` from the handoff's presigned-PUT model.
- **One `StorageAdapter` TypeScript interface** — internal contract; not an HTTP surface, but documented here as the seam other code integrates against.

Everything else (photo listing on the detail page, thumb strips, home mosaic) reuses existing server-rendered pages; the server-rendered pages call `queries.getItemWithRelations(id)`, which internally resolves signed URLs via the adapter.

## 2. Server Action — `uploadPhoto`

**Location:** `src/lib/actions/photos.ts`
**Export:** `export async function uploadPhoto(formData: FormData): Promise<ActionResult<{ imageId: string }>>`
**Authentication:** None in F-001 (LAN-only, single-user).
**Called from:** `PhotoDropZone` (client component) via the standard Next `"use server"` directive.

### Input — `FormData`

The client posts `FormData` with these keys:

| Key | Type | Required | Constraints |
|-----|------|----------|-------------|
| `itemId` | `string` | Yes | Must exist in `items` table; validated server-side. |
| `file` | `File` | Yes | MIME from browser (untrusted); size, dimensions, and true format validated server-side. |

There is no optional `displayOrder` in F-001 — the server derives it as `MAX(existing display_order for item) + 1`, or `0` if the item has no photos.

### Server-side validation pipeline (before any disk write)

1. **Zod parse** via `uploadPhotoSchema.safeParse({ itemId, file })`:
   - `itemId`: `z.string().min(1).max(64).regex(/^[a-z0-9-]+$/)`
   - `file`: `z.instanceof(File)` + `z.refine(f => f.size > 0, "empty")` + `z.refine(f => f.size <= 20 * 1024 * 1024, "too large")`
2. **Existence check**: `SELECT 1 FROM items WHERE id = ?`. If missing → `{ success: false, error: "Item not found" }`.
3. **Magic-byte sniff** on first 8 bytes (`src/lib/images/validate.ts`):
   - JPEG signature `FF D8 FF`
   - PNG signature `89 50 4E 47 0D 0A 1A 0A`
   - WebP signature `52 49 46 46 XX XX XX XX 57 45 42 50` (RIFF ... WEBP)
   - All others → `{ success: false, error: "Unsupported format. Use JPEG, PNG, or WebP." }`
4. **Dimension pre-check**: `sharp(buffer).metadata()` to read `width * height`. If `> 50_000_000 pixels` → `{ success: false, error: "Photo dimensions too large" }`. (Only reads the image header; does not decode pixel data — cheap.)

### Server-side pipeline (on validation success)

5. **Transform**: `sharp(buffer).rotate().withMetadata({}).jpeg({ quality: 92, mozjpeg: true })` (or matching format). This bakes orientation into pixels and strips all EXIF metadata. For WebP input, `.webp({ quality: 92 })`. For PNG, `.png({ compressionLevel: 9 })`.
6. **Generate ids**: `imageId = nanoid(10)`; derive key via `buildKey(itemId, imageId, 'original', ext)`.
7. **Write**: `await storage.write(originalKey, sanitizedBuffer, mimeType)` — writes to disk and fsyncs.
8. **Insert**: `INSERT INTO item_images (id, item_id, original_key, content_type, size_bytes, display_order, status) VALUES (imageId, itemId, originalKey, mime, size, displayOrder, 'pending')`.
9. **Enqueue**: `derivationQueue.add(() => deriveVariants(imageId))`.
10. **Revalidate**: `revalidatePath('/items/' + itemId)` and `revalidatePath('/collections/' + collectionId)`.
11. **Return**: `{ success: true, data: { imageId } }`.

### Failure cleanup

- **Insert fails after write** → `await storage.delete(originalKey)` then re-throw as `{ success: false, error: "..." }`. AC #6 / #29.
- **Enqueue fails after insert** → row stays `pending` (ADR-003 accepted debt). The server action still returns `{ success: true }` because the user-visible persistence succeeded; the failed enqueue is logged as an operator concern.
- **Transform throws** → no disk write happened yet; return `{ success: false, error: "Could not process image" }` with the sharp error in the structured log.

### Success response

```ts
type UploadPhotoSuccess = {
  success: true;
  data: { imageId: string };
};
```

### Failure responses (examples)

```ts
// Invalid item
{ success: false, error: "Item not found" }

// File too large
{ success: false, error: "Please choose a file 20 MB or smaller." }

// Not a real image
{ success: false, error: "Unsupported format. Use JPEG, PNG, or WebP." }

// Dimensions too large
{ success: false, error: "Photo dimensions too large. Try a smaller photo." }

// Transform or storage failure
{ success: false, error: "Could not save your photo. Try again." }
```

User-facing copy is intentionally generic on failures that indicate server problems, specific on failures the user can correct. Full error details are in the structured log.

### Example (client-side call)

```tsx
"use client";
import { useTransition } from "react";
import { uploadPhoto } from "@/lib/actions/photos";

function PhotoDropZone({ itemId }: { itemId: string }) {
  const [pending, start] = useTransition();
  const onFile = (file: File) => {
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("file", file);
    start(async () => {
      const result = await uploadPhoto(fd);
      if (!result.success) toast.error(result.error);
    });
  };
  // ...
}
```

## 3. Server Action — `deletePhoto` (stub in F-001)

**Location:** `src/lib/actions/photos.ts`
**Export:** `export async function deletePhoto(imageId: string): Promise<ActionResult<void>>`

F-001 ships this signature so the detail-page UI can reference it, but the implementation throws:

```ts
return {
  success: false,
  error: "Photo deletion lands in F-002. Delete the item to remove its photos for now.",
};
```

The real implementation arrives in F-002 `item-edit`.

## 4. HTTP Route — `GET /api/images/[key]`

**Location:** `src/app/api/images/[key]/route.ts`
**Method:** `GET` only. `POST`/`PUT`/`DELETE`/`PATCH` return 405.
**Authentication:** Signed URL only. The signed URL **is** the authentication.
**Called from:** `<img src="...">` tags rendered server-side with signed URLs, and `background-image: url(...)` in the stripe-gradient fallback code paths that occasionally reference stored files directly.

### Request

```
GET /api/images/<url-encoded key>?t=<epoch-seconds>&s=<hmac-hex>
```

Path parameter:
- `[key]` — URL-encoded object key. Example: `items%2Fsnk-01%2Fm3k9P8a2Qw%2Fdisplay.webp` decodes to `items/snk-01/m3k9P8a2Qw/display.webp`.

Query parameters:
- `t` (integer, required) — Unix epoch seconds at which the URL expires. Typically `now + 60`.
- `s` (hex string, required) — HMAC-SHA256 of `${key}:${t}` using `IMAGE_URL_SECRET`.

Headers:
- `If-None-Match`, `If-Modified-Since` — optional browser cache headers; honored by returning 304 when appropriate.

### Response — 200 OK

Streams the file bytes with:

| Header | Value | Notes |
|--------|-------|-------|
| `Content-Type` | Matches the stored variant (`image/jpeg`, `image/png`, `image/webp`) | |
| `Content-Length` | Byte length | From `fs.stat` |
| `Cache-Control` | `private, max-age=60` | Matches signed-URL TTL |
| `ETag` | `"<sha1 of key + size>"` | Lightweight; survives rename-less rewrites |

Body: binary stream of the requested variant.

### Error responses

**400 Bad Request — malformed key or traversal attempt**

```
Status: 400
Content-Type: text/plain
Body: "bad key"
```

Triggered by: `parseKey()` failure, `..` in the decoded path, absolute paths, keys not matching the allowed format.

**401 Unauthorized — missing, expired, or invalid token**

```
Status: 401
Content-Type: text/plain
Body: "not signed" | "expired" | "bad signature"
```

Triggered by: `t` missing, `t < now()`, `s` missing, or `hmac(key:t) !== s`.

**404 Not Found — key valid but no file exists**

```
Status: 404
Content-Type: text/plain
Body: "not found"
```

Triggered by: `storage.exists(key) === false` after signature verification passes.

**405 Method Not Allowed**

```
Status: 405
Allow: GET
```

Any method other than `GET`.

**500 Internal Server Error** — unhandled exception during read; logged with full stack trace.

### Example

```
GET /api/images/items%2Fsnk-01%2Fm3k9P8a2Qw%2Fdisplay.webp?t=1745356820&s=f3a9c8...

→ 200 OK
  Content-Type: image/webp
  Content-Length: 47823
  Cache-Control: private, max-age=60
  ETag: "abc123..."
  <binary>
```

### Rate limiting

None in F-001 (LAN, single-user). A signed URL *is* a rate limiter of sorts — URLs expire in 60 s and aren't guessable without the secret. If we ever expose the app to the public internet, rate limiting lands alongside F-005 `auth`.

## 5. Internal contract — `StorageAdapter` interface

**Location:** `src/lib/storage/adapter.ts`
**Imported by:** `src/lib/storage/local-disk.ts`, `src/lib/storage/s3.ts`, and indirectly by server actions and the image route.

Not an HTTP API, but every other piece of code integrates against it, so it's documented here as the core seam.

```ts
export type StorageKey = string; // validated, forward-slash, no ..

export interface StorageAdapter {
  /**
   * Persist bytes under `key`. MUST fsync before resolving so callers
   * can rely on durability upon return.
   */
  write(key: StorageKey, data: Buffer | Uint8Array, contentType: string): Promise<void>;

  /**
   * Read bytes as a Node.js Readable. Callers pipe to HTTP response.
   * Throws if the key does not exist.
   */
  read(key: StorageKey): Promise<NodeJS.ReadableStream>;

  /**
   * Remove the file at `key`. No-op if the key does not exist.
   */
  delete(key: StorageKey): Promise<void>;

  /**
   * True if a file exists at `key`.
   */
  exists(key: StorageKey): Promise<boolean>;

  /**
   * Return a URL the browser can fetch that resolves to this key.
   * For `LocalDiskStorage`, delegates to the signer and returns a
   * `/api/images/<key>?t=...&s=...` URL.
   * For `S3Storage`, will eventually return a presigned GET URL.
   * TTL in seconds; implementations MAY clamp to a sensible maximum.
   */
  signedUrl(key: StorageKey, ttlSeconds: number): Promise<string>;
}
```

### Factory

```ts
// src/lib/storage/index.ts
export function getStorage(): StorageAdapter {
  // cached singleton, resolved from STORAGE_BACKEND env var at first call
}
```

### Configuration at boot

The factory reads env via a Zod schema:

```ts
const envSchema = z.object({
  STORAGE_BACKEND: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./data/images"),
  IMAGE_URL_SECRET: z.string().min(32, "at least 32 bytes required"),
});
```

Missing or invalid env → process fails to boot with a clear error. No fallback values for `IMAGE_URL_SECRET`.

## 6. Revised Zod schemas in `src/lib/validators/kept.ts`

### Added

```ts
export const uploadPhotoSchema = z.object({
  itemId: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "invalid item id"),
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, "That file is empty")
    .refine((f) => f.size <= 20 * 1024 * 1024, "Please choose a file 20 MB or smaller."),
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;
```

### Removed

- `requestUploadSchema`
- `confirmUploadSchema`
- `RequestUploadInput`
- `ConfirmUploadInput`

These were written against the handoff's presigned-PUT flow and are no longer part of any code path.

## 7. Error-shape discipline

Every Server Action in F-001 returns the existing `ActionResult<T>` envelope:

```ts
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: "validation" | "not-found" | "storage" | "unknown" };
```

The optional `code` field is introduced by F-001 for programmatic client handling (e.g., show a retry button on `"storage"` errors, show field-level validation on `"validation"` errors). Existing actions can adopt `code` progressively; F-001's two actions use it.

## 8. Revalidation map

When does a mutation revalidate which path?

| Action | Revalidates |
|--------|-------------|
| `uploadPhoto(itemId, file)` on success | `/items/[itemId]`, `/collections/[collectionId]`, `/` (home mosaic) |
| `uploadPhoto` on failure | Nothing — the UI handles the error inline via `ActionResult` |
| derivation-worker success | The worker does NOT call `revalidatePath` — see PRD R-05.4 "no live polling." The UI sees the new state on the user's next navigation. |
| derivation-worker failure | Same — no revalidation; next nav shows the warning overlay. |
| `deletePhoto(imageId)` (F-002) | Future: `/items/[itemId]`, `/collections/[collectionId]`, `/` |

## 9. What's NOT an API surface in F-001

Restating for clarity so future additions don't drift:

- No `POST /api/images/upload` — the upload path is a Server Action, deliberately.
- No `DELETE /api/images/[key]` — deletion is a Server Action (stub in F-001, real in F-002).
- No listing endpoint (`GET /api/items/[id]/images`) — the detail page's server component reads directly from Drizzle.
- No presigned PUT URLs — stream-through-server only in F-001. Presigned PUT returns as a performance optimization when/if `S3Storage` goes live.
- No batch-upload endpoint — "multiple photos for one item in one action" is an explicit F-001 non-goal.
- No webhook, no queue endpoint, no admin endpoint — all internal.
