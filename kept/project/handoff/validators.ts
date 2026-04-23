// handoff/validators.ts
// Zod schemas mirroring every form in the UI. Single source of truth for:
//   1) server action input validation
//   2) react-hook-form resolvers (via @hookform/resolvers/zod)
//   3) TypeScript types via z.infer
//
// Drops into: src/lib/validators/kept.ts

import { z } from "zod";

// ---------- Shared ----------
// Tags: free-form strings, normalised to lowercase + trimmed.
// UI accepts comma-separated input; split in the server action after validation.
export const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9\s\-]*$/i, "Tags can contain letters, numbers, spaces and dashes")
  .transform((s) => s.toLowerCase());

export const tagsArraySchema = z.array(tagSchema).max(20);

/** Parse a raw "tree, heirloom, fragile" string into a validated array. */
export const tagsFromCsv = z
  .string()
  .transform((s) => s.split(",").map((t) => t.trim()).filter(Boolean))
  .pipe(tagsArraySchema);

export const normalizeTag = (t: string) => t.trim().toLowerCase();

// ---------- Collection ----------
// Fields the user is allowed to pick from in the New Collection step 2 chip grid.
// Keep in sync with app/Overlays.jsx#AVAILABLE_FIELDS.
export const AVAILABLE_FIELDS = [
  "Brand",
  "Model",
  "Colorway",
  "Size",
  "Box / Location",
  "Room",
  "Year acquired",
  "Condition",
  "Value",
  "Fragile",
] as const;

export const newCollectionSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(60),
  description: z.string().trim().max(240).optional(),
  fields: z.array(z.enum(AVAILABLE_FIELDS)).max(10).default([]),
});
export type NewCollectionInput = z.infer<typeof newCollectionSchema>;

export const updateCollectionSchema = newCollectionSchema.partial().extend({
  id: z.string().min(1),
});
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

// ---------- Item ----------
// `fieldValues` is free-form — the set of allowed keys is determined at runtime
// by the parent collection's `fields` array. Server action should cross-check
// keys against collection.fields before writing.
export const fieldValuesSchema = z.record(
  z.string().min(1).max(40),
  z.string().trim().max(200),
);

export const newItemSchema = z.object({
  collectionId: z.string().min(1),
  name: z.string().trim().min(1, "Give it a name").max(120),
  subtitle: z.string().trim().max(120).optional(),
  fieldValues: fieldValuesSchema.default({}),
  tags: tagsArraySchema.default([]),
  acquired: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type NewItemInput = z.infer<typeof newItemSchema>;

export const updateItemSchema = newItemSchema.partial().extend({
  id: z.string().min(1),
});
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// ---------- Image upload ----------
// Step 1: client asks for a presigned URL. Step 2: client confirms upload and
// we record the row + trigger sharp processing.
export const requestUploadSchema = z.object({
  itemId: z.string().min(1),
  filename: z.string().trim().min(1).max(200),
  contentType: z
    .string()
    .regex(/^image\/(jpeg|png|webp|heic|heif)$/, "Unsupported image type"),
  sizeBytes: z.number().int().positive().max(20 * 1024 * 1024, "Max 20MB"),
});
export type RequestUploadInput = z.infer<typeof requestUploadSchema>;

export const confirmUploadSchema = z.object({
  itemId: z.string().min(1),
  originalKey: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

// ---------- Search / filter (Browse view) ----------
export const browseFilterSchema = z.object({
  collectionId: z.string().min(1),
  q: z.string().trim().max(80).optional(),
  tag: z.string().trim().max(40).optional(),
});
export type BrowseFilter = z.infer<typeof browseFilterSchema>;
