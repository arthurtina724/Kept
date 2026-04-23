import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { nanoid } from "nanoid";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/dev.db";
const path = url.startsWith("file:") ? url.slice("file:".length) : url;
const dir = dirname(path);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const sqlite = new Database(path);
const db = drizzle(sqlite, { schema });

type SeedCollection = {
  id: string;
  name: string;
  owner: string;
  description: string;
  coverTone: string;
  fields: string[];
};

const COLLECTIONS: SeedCollection[] = [
  {
    id: "sneakers",
    name: "Sneakers",
    owner: "David",
    description: "Everyday rotation, grails, and boxes in the closet.",
    coverTone: "oklch(0.78 0.05 45)",
    fields: ["Brand", "Model", "Colorway", "Size"],
  },
  {
    id: "decor",
    name: "Christmas Decor",
    owner: "Sarah",
    description: "Ornaments, lights, and heirlooms — boxed in the attic.",
    coverTone: "oklch(0.8 0.04 140)",
    fields: [],
  },
  {
    id: "clothing",
    name: "Clothing",
    owner: "David",
    description: "Seasonal wardrobe and archival pieces.",
    coverTone: "oklch(0.82 0.03 250)",
    fields: ["Brand", "Size"],
  },
];

type SeedItem = {
  id: string;
  collectionId: string;
  name: string;
  subtitle?: string;
  fieldValues?: Record<string, string>;
  tags?: string[];
  acquired?: string;
};

const ITEMS: SeedItem[] = [
  { id: "snk-01", collectionId: "sneakers", name: "Air Max 1", subtitle: "USA Anniversary", fieldValues: { Brand: "Nike", Model: "Air Max 1", Colorway: "White / Red / Royal", Size: "US 10" }, tags: ["running", "og", "rotation"], acquired: "2024-03" },
  { id: "snk-02", collectionId: "sneakers", name: "Samba OG", subtitle: "Cloud White", fieldValues: { Brand: "Adidas", Model: "Samba OG", Colorway: "White / Core Black / Gum", Size: "US 10" }, tags: ["everyday", "rotation"], acquired: "2024-01" },
  { id: "snk-03", collectionId: "sneakers", name: "New Balance 990v6", subtitle: "Made in USA", fieldValues: { Brand: "New Balance", Model: "990v6", Colorway: "Grey", Size: "US 10" }, tags: ["dad", "rotation", "comfort"], acquired: "2023-11" },
  { id: "snk-04", collectionId: "sneakers", name: "Dunk Low", subtitle: "Panda", fieldValues: { Brand: "Nike", Model: "Dunk Low", Colorway: "Black / White", Size: "US 10" }, tags: ["everyday"], acquired: "2023-06" },
  { id: "snk-05", collectionId: "sneakers", name: "Jordan 4", subtitle: "Military Blue", fieldValues: { Brand: "Jordan", Model: "Air Jordan 4 Retro", Colorway: "White / Military Blue / Neutral Grey", Size: "US 10" }, tags: ["grails", "archive"], acquired: "2024-05" },
  { id: "snk-06", collectionId: "sneakers", name: "Clarks Wallabee", subtitle: "Maple Suede", fieldValues: { Brand: "Clarks", Model: "Wallabee", Colorway: "Maple", Size: "US 10" }, tags: ["casual", "rotation"], acquired: "2023-09" },
  { id: "snk-07", collectionId: "sneakers", name: "Gazelle Indoor", subtitle: "Bliss Pink", fieldValues: { Brand: "Adidas", Model: "Gazelle Indoor", Colorway: "Bliss Pink / Cream", Size: "US 10" }, tags: ["rotation"], acquired: "2024-02" },
  { id: "snk-08", collectionId: "sneakers", name: "Salomon XT-6", subtitle: "Phantom", fieldValues: { Brand: "Salomon", Model: "XT-6", Colorway: "Phantom / Black", Size: "US 10" }, tags: ["trail", "technical"], acquired: "2023-12" },
  { id: "snk-09", collectionId: "sneakers", name: "Converse Chuck 70", subtitle: "Black Hi", fieldValues: { Brand: "Converse", Model: "Chuck 70 Hi", Colorway: "Black / Egret", Size: "US 10" }, tags: ["og", "rotation"], acquired: "2022-08" },
  { id: "snk-10", collectionId: "sneakers", name: "Asics GT-2160", subtitle: "Cream / Cilantro", fieldValues: { Brand: "Asics", Model: "GT-2160", Colorway: "Cream / Cilantro", Size: "US 10" }, tags: ["rotation", "running"], acquired: "2024-04" },
  { id: "snk-11", collectionId: "sneakers", name: "Onitsuka Mexico 66", subtitle: "White / Blue", fieldValues: { Brand: "Onitsuka Tiger", Model: "Mexico 66", Colorway: "White / Blue", Size: "US 10" }, tags: ["casual"], acquired: "2023-05" },
  { id: "snk-12", collectionId: "sneakers", name: "Merrell 1TRL", subtitle: "Moab Mythos", fieldValues: { Brand: "Merrell", Model: "1TRL Moab", Colorway: "Olive / Tan", Size: "US 10" }, tags: ["trail", "archive"], acquired: "2024-06" },

  { id: "dec-01", collectionId: "decor", name: "Grandma's glass birds", tags: ["tree", "heirloom", "fragile"], acquired: "inherited" },
  { id: "dec-02", collectionId: "decor", name: "Ceramic village — 6 pc set", tags: ["mantle", "village"] },
  { id: "dec-03", collectionId: "decor", name: "Outdoor warm-white lights — 200ft", tags: ["outdoor", "lights"] },
  { id: "dec-04", collectionId: "decor", name: "Hand-stitched stockings (4)", tags: ["mantle", "fabric"] },
  { id: "dec-05", collectionId: "decor", name: "Nutcracker, tall", tags: ["decor", "heirloom"] },
  { id: "dec-06", collectionId: "decor", name: "Wreath — cedar & eucalyptus", tags: ["outdoor", "wreath"] },
  { id: "dec-07", collectionId: "decor", name: "Tree topper — brass star", tags: ["tree", "heirloom"] },
  { id: "dec-08", collectionId: "decor", name: "Vintage tin ornaments (12)", tags: ["tree", "vintage"] },
  { id: "dec-09", collectionId: "decor", name: "Advent calendar — wooden", tags: ["advent", "wood"] },
];

function seed() {
  console.log("clearing existing rows…");
  db.run(sql`DELETE FROM item_tags`);
  db.run(sql`DELETE FROM item_images`);
  db.run(sql`DELETE FROM tags`);
  db.run(sql`DELETE FROM items`);
  db.run(sql`DELETE FROM collections`);

  console.log("inserting collections…");
  for (const c of COLLECTIONS) {
    db.insert(schema.collections)
      .values({
        id: c.id,
        name: c.name,
        description: c.description,
        owner: c.owner,
        coverTone: c.coverTone,
        fields: c.fields,
      })
      .run();
  }

  const tagIdsByCollection = new Map<string, Map<string, string>>();
  const ensureTag = (collectionId: string, name: string): string => {
    let inner = tagIdsByCollection.get(collectionId);
    if (!inner) {
      inner = new Map();
      tagIdsByCollection.set(collectionId, inner);
    }
    const existing = inner.get(name);
    if (existing) return existing;
    const id = nanoid(10);
    db.insert(schema.tags).values({ id, collectionId, name }).run();
    inner.set(name, id);
    return id;
  };

  console.log("inserting items + tags…");
  for (const it of ITEMS) {
    db.insert(schema.items)
      .values({
        id: it.id,
        collectionId: it.collectionId,
        name: it.name,
        subtitle: it.subtitle ?? null,
        fieldValues: it.fieldValues ?? {},
        acquired: it.acquired ?? null,
      })
      .run();

    for (const t of it.tags ?? []) {
      const tagId = ensureTag(it.collectionId, t.toLowerCase());
      db.insert(schema.itemTags).values({ itemId: it.id, tagId }).run();
    }
  }

  const totals = {
    collections: db.select().from(schema.collections).all().length,
    items: db.select().from(schema.items).all().length,
    tags: db.select().from(schema.tags).all().length,
  };
  console.log("seeded:", totals);
  sqlite.close();
}

seed();
