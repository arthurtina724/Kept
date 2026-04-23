import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "./index";
import { placeholderTones } from "@/lib/placeholder";
import type {
  CollectionWithPreview,
  HomeData,
  ItemCard,
  ItemWithRelations,
} from "@/types/kept";

function toCard(
  item: typeof schema.items.$inferSelect,
  collectionName?: string,
): ItemCard {
  const fv = item.fieldValues ?? {};
  const caption = fv["Size"] ?? fv["Brand"] ?? fv["Model"] ?? item.subtitle ?? null;
  return {
    id: item.id,
    collectionId: item.collectionId,
    collectionName,
    name: item.name,
    subtitle: item.subtitle,
    caption,
    acquired: item.acquired,
    photoUrl: null,
    placeholder: placeholderTones(item.id),
  };
}

export async function getHomeData(): Promise<HomeData> {
  const allCollections = db
    .select()
    .from(schema.collections)
    .orderBy(schema.collections.createdAt)
    .all();

  const itemCounts = db
    .select({
      collectionId: schema.items.collectionId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(schema.items)
    .groupBy(schema.items.collectionId)
    .all();
  const countByCollection = new Map(
    itemCounts.map((r) => [r.collectionId, Number(r.count)]),
  );

  const collections: CollectionWithPreview[] = allCollections.map((c) => {
    const preview = db
      .select({ id: schema.items.id })
      .from(schema.items)
      .where(eq(schema.items.collectionId, c.id))
      .orderBy(schema.items.createdAt)
      .limit(3)
      .all();
    const tiles: Array<ReturnType<typeof placeholderTones> | null> = [0, 1, 2].map(
      (i) => (preview[i] ? placeholderTones(preview[i].id) : null),
    );
    return {
      ...c,
      itemCount: countByCollection.get(c.id) ?? 0,
      previewTiles: tiles,
    };
  });

  const recentRows = db
    .select({
      item: schema.items,
      collectionName: schema.collections.name,
    })
    .from(schema.items)
    .leftJoin(schema.collections, eq(schema.items.collectionId, schema.collections.id))
    .orderBy(desc(schema.items.createdAt))
    .limit(6)
    .all();
  const recent: ItemCard[] = recentRows.map((r) =>
    toCard(r.item, r.collectionName ?? undefined),
  );

  const totals = {
    collections: allCollections.length,
    items: db.select().from(schema.items).all().length,
    tags: db.select().from(schema.tags).all().length,
  };

  return { collections, recent, totals };
}

export async function getCollection(id: string) {
  const collection = db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.id, id))
    .get();
  if (!collection) return null;

  const itemRows = db
    .select()
    .from(schema.items)
    .where(eq(schema.items.collectionId, id))
    .orderBy(desc(schema.items.createdAt))
    .all();

  const itemIds = itemRows.map((i) => i.id);
  const tagRows =
    itemIds.length > 0
      ? db
          .select({
            itemId: schema.itemTags.itemId,
            name: schema.tags.name,
          })
          .from(schema.itemTags)
          .innerJoin(schema.tags, eq(schema.itemTags.tagId, schema.tags.id))
          .where(inArray(schema.itemTags.itemId, itemIds))
          .all()
      : [];

  const tagsByItem = new Map<string, string[]>();
  for (const r of tagRows) {
    const arr = tagsByItem.get(r.itemId) ?? [];
    arr.push(r.name);
    tagsByItem.set(r.itemId, arr);
  }

  const items = itemRows.map((i) => ({
    ...toCard(i, collection.name),
    tags: tagsByItem.get(i.id) ?? [],
  }));

  const tagCounts = db
    .select({ name: schema.tags.name, count: sql<number>`count(*)`.as("count") })
    .from(schema.tags)
    .leftJoin(schema.itemTags, eq(schema.itemTags.tagId, schema.tags.id))
    .where(eq(schema.tags.collectionId, id))
    .groupBy(schema.tags.id, schema.tags.name)
    .all();

  return {
    collection,
    items,
    tagCounts: tagCounts
      .map((t) => ({ name: t.name, count: Number(t.count) }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getItemWithRelations(
  id: string,
): Promise<ItemWithRelations | null> {
  const item = db.select().from(schema.items).where(eq(schema.items.id, id)).get();
  if (!item) return null;

  const collection = db
    .select()
    .from(schema.collections)
    .where(eq(schema.collections.id, item.collectionId))
    .get();
  if (!collection) return null;

  const images = db
    .select()
    .from(schema.itemImages)
    .where(eq(schema.itemImages.itemId, id))
    .orderBy(schema.itemImages.displayOrder)
    .all();

  const tagRows = db
    .select({ name: schema.tags.name })
    .from(schema.itemTags)
    .innerJoin(schema.tags, eq(schema.itemTags.tagId, schema.tags.id))
    .where(eq(schema.itemTags.itemId, id))
    .all();

  return {
    ...item,
    collection,
    images,
    tags: tagRows.map((r) => r.name),
    heroPhotoUrl: null,
    placeholder: placeholderTones(item.id),
  };
}

export async function getRelatedItems(collectionId: string, excludeId: string, limit = 4) {
  const rows = db
    .select()
    .from(schema.items)
    .where(
      and(
        eq(schema.items.collectionId, collectionId),
        sql`${schema.items.id} != ${excludeId}`,
      ),
    )
    .orderBy(desc(schema.items.createdAt))
    .limit(limit)
    .all();
  return rows.map((i) => toCard(i));
}

export async function countItemsInCollection(collectionId: string): Promise<number> {
  const r = db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(schema.items)
    .where(eq(schema.items.collectionId, collectionId))
    .get();
  return Number(r?.count ?? 0);
}
