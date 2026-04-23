# Server Actions

All mutations the UI triggers, mapped to named server actions. Every action:

1. Validates input with its Zod schema from `validators.ts`.
2. Executes via Drizzle.
3. Calls `revalidatePath()` for the affected routes.
4. Returns `ActionResult<T>` (see `types.ts`).

File: `src/lib/actions/kept.ts`

## Collection actions

### `createCollection(input: NewCollectionInput)`
- UI trigger: `NewCatalogModal` → "Create collection" button
- Validator: `newCollectionSchema`
- Writes: one row to `collections`
- Returns: `{ id: string }`
- Revalidates: `/`

### `updateCollection(input: UpdateCollectionInput)`
- UI trigger: collection settings (not in v1 prototype — add when editing collections is designed)
- Validator: `updateCollectionSchema`
- Revalidates: `/`, `/collections/[id]`

### `deleteCollection(id: string)`
- Cascades to items + images + tags (FK `onDelete: "cascade"`)
- Also needs to delete S3 objects — enumerate images first, batch-delete keys, then delete the row
- Revalidates: `/`

## Item actions

### `createItem(input: NewItemInput)`
- UI trigger: `AddItemModal` → "Save item" button
- Validator: `newItemSchema`
- Writes:
  - one row to `items` (with `fieldValues` JSON)
  - upserts tag rows + join rows for each tag in `input.tags`
- ID generation: `${collectionSlug}-${nextSerial}` — server-side counter per collection
- Returns: `{ id: string }`
- Revalidates: `/`, `/collections/[collectionId]`

### `updateItem(input: UpdateItemInput)`
- UI trigger: item detail "Edit item" button (edit flow not in prototype — future work)
- Validator: `updateItemSchema`
- Partial update; re-syncs tags if `tags` is present
- Revalidates: `/items/[id]`, `/collections/[id]`, `/`

### `deleteItem(id: string)`
- UI trigger: item detail "Delete" button
- Deletes S3 objects first (via `itemImages` rows), then the row (cascades to tags/images)
- Revalidates: `/`, `/collections/[collectionId]`

### `duplicateItem(id: string)`
- UI trigger: item detail "Duplicate" button
- Copies row + `fieldValues` + tags into same collection with `name: `${name} (copy)``
- Does NOT copy images (user re-uploads or manually copies keys)
- Revalidates: `/collections/[collectionId]`, `/`

## Image actions

See `image-pipeline.md` for the full flow.

### `requestUpload(input: RequestUploadInput)`
- Validator: `requestUploadSchema`
- Returns: `{ uploadUrl: string, objectKey: string }` (presigned PUT, 5-min expiry)

### `confirmUpload(input: ConfirmUploadInput)`
- Validator: `confirmUploadSchema`
- Writes `item_images` row
- Enqueues / inline-runs sharp thumbnail + display variants
- Revalidates: `/items/[itemId]`, `/collections/[collectionId]`, `/`

### `deleteImage(imageId: string)`
- Deletes S3 objects (original + thumb + display) then the row
- Revalidates: `/items/[itemId]`

## Tweaks (theme preferences)

No DB action needed for v1 — persist to `localStorage` client-side. If you
add auth later, move to a `user_preferences` row keyed by user id.
