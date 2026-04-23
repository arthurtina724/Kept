// handoff/types.ts
// Shared types the UI + server actions consume. Most are re-exports
// from schema + validators — this file exists so components don't import
// DB code directly (keeps the server/client boundary clean).
//
// Drops into: src/types/kept.ts

import type { Collection, Item, ItemImage, Tag } from "../handoff/schema";
import type {
  NewCollectionInput,
  NewItemInput,
  UpdateCollectionInput,
  UpdateItemInput,
  BrowseFilter,
} from "../handoff/validators";

export type { Collection, Item, ItemImage, Tag };
export type {
  NewCollectionInput,
  NewItemInput,
  UpdateCollectionInput,
  UpdateItemInput,
  BrowseFilter,
};

/** Item with its images and tags joined — the shape the Detail page expects. */
export type ItemWithRelations = Item & {
  collection: Collection;
  images: ItemImage[];
  tags: string[]; // flattened from itemTags/tags join
  /** Presigned GET URL for the hero image. null if no photo. */
  heroPhotoUrl: string | null;
};

/** Card shape for the Browse masonry grid. Slimmer than full item. */
export type ItemCard = {
  id: string;
  name: string;
  subtitle?: string;
  /** Value to render under the name (e.g. "US 10" for sneakers). */
  caption?: string;
  photoUrl: string | null;
  /** Fallback tone for the striped placeholder when photoUrl is null. */
  placeholder: { tone: string; accentTone: string; stripeAngle: number };
};

/** Home page data. One fetch, server component. */
export type HomeData = {
  collections: Array<Collection & {
    itemCount: number;
    previewPhotos: Array<string | null>; // first 3 images for the mosaic
  }>;
  recent: ItemCard[]; // last 6 items across all collections
  totals: { collections: number; items: number; tags: number };
};

/** Server-action result envelope — every action returns this. */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };
