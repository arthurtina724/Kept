import type { Collection, Item, ItemImage, Tag } from "@/lib/db/schema";
import type {
  NewCollectionInput,
  NewItemInput,
  UpdateCollectionInput,
  UpdateItemInput,
  BrowseFilter,
} from "@/lib/validators/kept";

export type { Collection, Item, ItemImage, Tag };
export type {
  NewCollectionInput,
  NewItemInput,
  UpdateCollectionInput,
  UpdateItemInput,
  BrowseFilter,
};

export type PlaceholderTones = { tone: string; accentTone: string; stripeAngle: number };

export type ItemWithRelations = Item & {
  collection: Collection;
  images: ItemImage[];
  tags: string[];
  heroPhotoUrl: string | null;
  placeholder: PlaceholderTones;
};

export type ItemCard = {
  id: string;
  collectionId: string;
  collectionName?: string;
  name: string;
  subtitle?: string | null;
  caption?: string | null;
  acquired?: string | null;
  photoUrl: string | null;
  placeholder: PlaceholderTones;
};

export type CollectionWithPreview = Collection & {
  itemCount: number;
  previewTiles: Array<PlaceholderTones | null>;
};

export type HomeData = {
  collections: CollectionWithPreview[];
  recent: ItemCard[];
  totals: { collections: number; items: number; tags: number };
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };
