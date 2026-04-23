// handoff/schema.ts
// Drizzle ORM schema for Kept — authored against SQLite (dev).
// When migrating to Postgres: swap `sqliteTable` → `pgTable`, `integer { mode: "timestamp" }`
// → `timestamp`, and consider `jsonb` for the `fields` / `fieldValues` columns.
//
// Drops into: src/lib/db/schema.ts

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ---------- Collections ----------
// A collection groups related items (Sneakers, Christmas Decor, Books…).
// `fields` is a JSON array of field names the user chose to track
// (e.g. ["Brand", "Model", "Size"]). Tags are always implicitly included.
export const collections = sqliteTable("collections", {
  id: text("id").primaryKey(), // slug-ish, e.g. "sneakers"
  name: text("name").notNull(),
  description: text("description"),
  owner: text("owner"), // free-form for v1 (pre-auth); becomes FK to users later
  coverTone: text("cover_tone"), // OKLCH color string for the mosaic fallback
  fields: text("fields", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;

// ---------- Items ----------
// `fieldValues` is a JSON object keyed by the collection's field names.
// e.g. { "Brand": "Nike", "Model": "Air Max 1", "Size": "US 10" }
// Separate table keeps the core item row slim; indexes on name/brand live here.
export const items = sqliteTable("items", {
  id: text("id").primaryKey(), // short human-readable, e.g. "snk-01"
  collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subtitle: text("subtitle"),
  fieldValues: text("field_values", { mode: "json" }).$type<Record<string, string>>().notNull().default(sql`'{}'`),
  acquired: text("acquired"), // free-form date string ("2024-03", "inherited", "2023")
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

// ---------- Item Images ----------
// Object keys only — no binary in the DB. See image-pipeline.md.
// `displayOrder` controls gallery ordering (0 = hero).
export const itemImages = sqliteTable("item_images", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  originalKey: text("original_key").notNull(), // products/{itemId}/{uuid}.jpg
  thumbKey: text("thumb_key"), // 200px WebP
  displayKey: text("display_key"), // 800px WebP
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type ItemImage = typeof itemImages.$inferSelect;
export type NewItemImage = typeof itemImages.$inferInsert;

// ---------- Tags + Item↔Tag join ----------
// Tags are normalised (lowercase, trimmed) on write. See validators.ts#normalizeTag.
// Scoped per-collection so "og" in Sneakers ≠ "og" in another collection.
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // lowercase, trimmed
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type Tag = typeof tags.$inferSelect;

export const itemTags = sqliteTable("item_tags", {
  itemId: text("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: [t.itemId, t.tagId],
}));

// ---------- Relations ----------
export const collectionsRelations = relations(collections, ({ many }) => ({
  items: many(items),
  tags: many(tags),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  collection: one(collections, { fields: [items.collectionId], references: [collections.id] }),
  images: many(itemImages),
  itemTags: many(itemTags),
}));

export const itemImagesRelations = relations(itemImages, ({ one }) => ({
  item: one(items, { fields: [itemImages.itemId], references: [items.id] }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  collection: one(collections, { fields: [tags.collectionId], references: [collections.id] }),
  itemTags: many(itemTags),
}));

export const itemTagsRelations = relations(itemTags, ({ one }) => ({
  item: one(items, { fields: [itemTags.itemId], references: [items.id] }),
  tag: one(tags, { fields: [itemTags.tagId], references: [tags.id] }),
}));
