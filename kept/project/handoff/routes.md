# Routes

The prototype uses a single-page state machine (`route` in `Kept.html`).
Port to Next.js App Router as follows:

| Prototype route | Next.js path | Rendering |
|---|---|---|
| `{ name: "home" }` | `src/app/page.tsx` | Server component — fetch `HomeData` |
| `{ name: "browse", catalogId }` | `src/app/collections/[id]/page.tsx` | Server component — fetch collection + items; client toolbar for search/tag filter |
| `{ name: "detail", itemId }` | `src/app/items/[id]/page.tsx` | Server component — fetch `ItemWithRelations` |

Modals (`AddItemModal`, `NewCollectionModal`) are client components triggered
from buttons. Consider parallel routes + intercepted routes if you want
modals to have URLs (`/items/new`, `/collections/new`) without a full page
navigation — nice-to-have, not required.

## URL conventions

- Collection IDs are slugs: `/collections/sneakers`, `/collections/christmas-decor`
- Item IDs stay human-readable: `/items/snk-01`
- Breadcrumbs in Browse view: `Kept › Sneakers` → home link + collection name

## Data fetching

```tsx
// src/app/page.tsx
import { getHomeData } from "@/lib/db/queries";

export default async function HomePage() {
  const data = await getHomeData();
  return <HomeView data={data} />;
}
```

`HomeView` can be a client component that receives plain props — no
client-side data fetching needed for the initial render.

## Revalidation

Each mutation in `server-actions.md` calls `revalidatePath()`:

- Create/update/delete item → revalidate `/` and `/collections/[id]` and `/items/[id]`
- Create/update/delete collection → revalidate `/` and `/collections/[id]`
- Upload/delete image → revalidate `/items/[id]`
