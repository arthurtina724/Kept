"use server";

import { and, eq, like, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import {
  newCollectionSchema,
  newItemSchema,
  type NewCollectionInput,
  type NewItemInput,
  type UpdateItemInput,
  updateItemSchema,
  normalizeTag,
} from "@/lib/validators/kept";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/types/kept";

function zodFail<T>(err: unknown): ActionResult<T> {
  if (err && typeof err === "object" && "issues" in err) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of (err as { issues: Array<{ path: unknown[]; message: string }> }).issues) {
      const key = issue.path.map(String).join(".");
      fieldErrors[key] = issue.message;
    }
    return { success: false, error: "Please fix the errors below.", fieldErrors };
  }
  return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
}

function upsertTags(collectionId: string, rawTags: string[], itemId: string) {
  const names = [...new Set(rawTags.map(normalizeTag).filter(Boolean))];
  if (names.length === 0) return;

  for (const name of names) {
    const existing = db
      .select()
      .from(schema.tags)
      .where(and(eq(schema.tags.collectionId, collectionId), eq(schema.tags.name, name)))
      .get();
    const tagId = existing?.id ?? nanoid(10);
    if (!existing) {
      db.insert(schema.tags).values({ id: tagId, collectionId, name }).run();
    }
    db.insert(schema.itemTags).values({ itemId, tagId }).onConflictDoNothing().run();
  }
}

function clearItemTags(itemId: string) {
  db.delete(schema.itemTags).where(eq(schema.itemTags.itemId, itemId)).run();
}

function uniqueCollectionId(base: string): string {
  let candidate = base || "collection";
  let n = 1;
  while (db.select().from(schema.collections).where(eq(schema.collections.id, candidate)).get()) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

function nextItemId(collectionId: string): string {
  const prefix = collectionId.slice(0, 3);
  const existing = db
    .select({ id: schema.items.id })
    .from(schema.items)
    .where(
      and(
        eq(schema.items.collectionId, collectionId),
        like(schema.items.id, `${prefix}-%`),
      ),
    )
    .all();
  let max = 0;
  for (const r of existing) {
    const m = r.id.match(/-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(2, "0")}`;
}

export async function createCollection(
  input: NewCollectionInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = newCollectionSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  try {
    const id = uniqueCollectionId(slugify(parsed.data.name));
    db.insert(schema.collections)
      .values({
        id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        fields: parsed.data.fields,
      })
      .run();
    revalidatePath("/");
    return { success: true, data: { id } };
  } catch (err) {
    return zodFail(err);
  }
}

export async function createItem(
  input: NewItemInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = newItemSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  try {
    const collection = db
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.id, parsed.data.collectionId))
      .get();
    if (!collection) return { success: false, error: "Collection not found." };

    const allowed = new Set(collection.fields ?? []);
    const filteredFields = Object.fromEntries(
      Object.entries(parsed.data.fieldValues).filter(([k, v]) => allowed.has(k) && v.length > 0),
    );

    const id = nextItemId(collection.id);
    db.insert(schema.items)
      .values({
        id,
        collectionId: collection.id,
        name: parsed.data.name,
        subtitle: parsed.data.subtitle ?? null,
        fieldValues: filteredFields,
        acquired: parsed.data.acquired ?? null,
        notes: parsed.data.notes ?? null,
      })
      .run();

    upsertTags(collection.id, parsed.data.tags, id);

    revalidatePath("/");
    revalidatePath(`/collections/${collection.id}`);
    return { success: true, data: { id } };
  } catch (err) {
    return zodFail(err);
  }
}

export async function updateItem(
  input: UpdateItemInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  try {
    const existing = db
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, parsed.data.id))
      .get();
    if (!existing) return { success: false, error: "Item not found." };

    const patch: Partial<typeof schema.items.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.subtitle !== undefined) patch.subtitle = parsed.data.subtitle ?? null;
    if (parsed.data.acquired !== undefined) patch.acquired = parsed.data.acquired ?? null;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes ?? null;
    if (parsed.data.fieldValues !== undefined) patch.fieldValues = parsed.data.fieldValues;

    db.update(schema.items).set(patch).where(eq(schema.items.id, existing.id)).run();

    if (parsed.data.tags !== undefined) {
      clearItemTags(existing.id);
      upsertTags(existing.collectionId, parsed.data.tags, existing.id);
    }

    revalidatePath("/");
    revalidatePath(`/items/${existing.id}`);
    revalidatePath(`/collections/${existing.collectionId}`);
    return { success: true, data: { id: existing.id } };
  } catch (err) {
    return zodFail(err);
  }
}

export async function deleteItem(id: string): Promise<ActionResult> {
  try {
    const existing = db.select().from(schema.items).where(eq(schema.items.id, id)).get();
    if (!existing) return { success: false, error: "Item not found." };
    db.delete(schema.items).where(eq(schema.items.id, id)).run();
    revalidatePath("/");
    revalidatePath(`/collections/${existing.collectionId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return zodFail(err);
  }
}

export async function duplicateItem(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const existing = db.select().from(schema.items).where(eq(schema.items.id, id)).get();
    if (!existing) return { success: false, error: "Item not found." };

    const tagRows = db
      .select({ name: schema.tags.name })
      .from(schema.itemTags)
      .innerJoin(schema.tags, eq(schema.itemTags.tagId, schema.tags.id))
      .where(eq(schema.itemTags.itemId, id))
      .all();

    const newId = nextItemId(existing.collectionId);
    db.insert(schema.items)
      .values({
        id: newId,
        collectionId: existing.collectionId,
        name: `${existing.name} (copy)`,
        subtitle: existing.subtitle,
        fieldValues: existing.fieldValues,
        acquired: existing.acquired,
        notes: existing.notes,
      })
      .run();

    upsertTags(
      existing.collectionId,
      tagRows.map((r) => r.name),
      newId,
    );

    revalidatePath("/");
    revalidatePath(`/collections/${existing.collectionId}`);
    return { success: true, data: { id: newId } };
  } catch (err) {
    return zodFail(err);
  }
}

// Avoid unused-import warning in dev when no `sql` template use is added later.
void sql;
