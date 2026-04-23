# Image Pipeline

The UI expects this flow — matching the presigned-URL pattern in the spec.

## Upload flow (AddItemModal)

```
Client                               Server (action)               S3 (MinIO / R2 / S3)
  |                                     |                                 |
  | 1. User picks file in .photo-drop   |                                 |
  |------------------------------------>|                                 |
  |                                     | 2. requestUpload(input)         |
  |                                     |    - Zod validate size + MIME   |
  |                                     |    - Generate objectKey         |
  |                                     |    - Presign PUT (5min)         |
  |<------------------------------------|                                 |
  |                                     |                                 |
  | 3. PUT file -> presigned URL        |                                 |
  |---------------------------------------------------------------------->|
  |<----------------------------------------------------------------------|
  |                                     |                                 |
  | 4. confirmUpload({objectKey,...})   |                                 |
  |------------------------------------>|                                 |
  |                                     | 5. Insert item_images row       |
  |                                     | 6. Fetch + sharp process:       |
  |                                     |    - thumb (200w WebP)          |
  |                                     |    - display (800w WebP)        |
  |                                     |    - strip EXIF                 |
  |                                     | 7. PUT derivatives -------------|---->|
  |                                     | 8. Update row with keys         |
  |<------------------------------------|                                 |
```

## Object key scheme

```
items/{itemId}/{imageId}/original.{ext}
items/{itemId}/{imageId}/thumb.webp     (200w)
items/{itemId}/{imageId}/display.webp   (800w)
```

Rationale: grouping by item makes bulk delete (cascade on item removal) a
single prefix delete; `imageId` subfolder lets multiple photos per item live
side-by-side.

## Serving images

Home-network / private app: generate short-lived presigned GET URLs on the
server and pass them into `<Image>` via props. The Browse view expects
`ItemCard.photoUrl` and Detail view expects `ItemWithRelations.heroPhotoUrl`
— both already presigned when they reach the client.

Public: put Cloudflare in front of R2 (or CloudFront + S3) and make display
and thumb keys publicly readable. Keep `original` private.

## next.config.ts

```ts
images: {
  remotePatterns: [
    { protocol: "http", hostname: "localhost", port: "9000" }, // MinIO dev
    { protocol: "https", hostname: "your-r2-or-s3-hostname" }, // prod
  ],
},
```

## Placeholder fallback

When `photoUrl` is null, the UI renders the striped-gradient placeholder
(`ItemPhoto` in `app/components.jsx`). Keep this behaviour — it's the
"no photo yet" affordance and preserves the editorial feel.

Generate `placeholder.tone` / `accentTone` / `stripeAngle` deterministically
from the item id (hash the id → hue) so they're stable across reloads.
That code is in `app/data.js` and `app/components.jsx` — port the hash
function verbatim.

## Constraints

- Max upload: **20 MB** (matches UI copy in photo-drop)
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
- Strip EXIF for privacy
- Refuse files whose Content-Length header exceeds the cap (reject in `requestUpload`, not just in the proxy)
