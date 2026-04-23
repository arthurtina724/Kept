import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection, getHomeData } from "@/lib/db/queries";
import { Masthead } from "@/components/ui/Masthead";
import { BrowseGrid } from "@/components/features/BrowseGrid";
import { AddItemDialog } from "@/components/features/AddItemDialog";
import { TweaksPanel } from "@/components/features/TweaksPanel";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCollection(id);
  if (!data) notFound();
  const { collection, items, tagCounts } = data;

  const home = await getHomeData();

  return (
    <div className="app">
      <Masthead />

      <div className="browse-head">
        <div className="title-block">
          <div className="crumb">
            <Link href="/">Kept</Link> · <span>{collection.name}</span>
          </div>
          <h1>{collection.name}</h1>
          {collection.description ? (
            <div className="desc">{collection.description}</div>
          ) : null}
        </div>
        <div className="stats" style={{ display: "flex", gap: 40 }}>
          <div className="stat">
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 44,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {items.length}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                marginTop: 6,
              }}
            >
              Items
            </div>
          </div>
          <div className="stat">
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 44,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {tagCounts.length}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                marginTop: 6,
              }}
            >
              Tags
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <AddItemDialog
          collections={home.collections.map((c) => ({
            id: c.id,
            name: c.name,
            fields: c.fields,
            itemCount: c.itemCount,
          }))}
          initialCollectionId={collection.id}
          triggerLabel="New item"
          triggerClassName="btn primary"
        />
      </div>

      <BrowseGrid items={items} tagCounts={tagCounts} />

      <div className="footer">
        <span>
          {collection.name} · {collection.owner ?? "—"}
        </span>
        <span>{items.length} items</span>
      </div>

      <TweaksPanel />
    </div>
  );
}
