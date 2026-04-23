import Link from "next/link";
import { getHomeData } from "@/lib/db/queries";
import { Masthead } from "@/components/ui/Masthead";
import { ItemPhoto } from "@/components/ui/ItemPhoto";
import { AddItemDialog } from "@/components/features/AddItemDialog";
import { NewCollectionDialog } from "@/components/features/NewCollectionDialog";
import { TweaksPanel } from "@/components/features/TweaksPanel";
import { stripeBackground } from "@/lib/placeholder";
import { zeroPad } from "@/lib/utils";

export default async function HomePage() {
  const { collections, recent, totals } = await getHomeData();

  return (
    <div className="app">
      <Masthead volume="Vol. I — Spring 2026" />

      <div className="hero">
        <h1>
          The things <em>worth keeping</em>, kept.
        </h1>
        <div className="stats">
          <div className="stat">
            <div className="num">{zeroPad(totals.collections)}</div>
            <div className="lbl">Collections</div>
          </div>
          <div className="stat">
            <div className="num">{totals.items}</div>
            <div className="lbl">Items</div>
          </div>
          <div className="stat">
            <div className="num">{totals.tags}</div>
            <div className="lbl">Tags</div>
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2>Collections</h2>
        <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
          <AddItemDialog
            collections={collections.map((c) => ({
              id: c.id,
              name: c.name,
              fields: c.fields,
              itemCount: c.itemCount,
            }))}
            triggerLabel="Add item"
            triggerClassName="btn ghost"
          />
        </div>
      </div>

      <div className="catalogs">
        {collections.map((c, idx) => (
          <Link key={c.id} href={`/collections/${c.id}`} className="catalog-card">
            <div className="cover">
              <div className="mosaic">
                {[0, 1, 2].map((i) => {
                  const tone = c.previewTiles[i];
                  if (!tone) {
                    return (
                      <div
                        key={i}
                        className="tile"
                        style={{ background: c.coverTone ?? "var(--paper-2)" }}
                      />
                    );
                  }
                  return (
                    <div
                      key={i}
                      className="tile"
                      style={{ background: stripeBackground(tone) }}
                    />
                  );
                })}
              </div>
              <div className="stamp">№ {zeroPad(idx + 1)}</div>
            </div>
            <div className="cat-name serif">{c.name}</div>
            {c.description ? <div className="cat-desc">{c.description}</div> : null}
            <div className="cat-meta">
              <span>{c.itemCount} items</span>
              <span>{c.owner ? `Est. ${c.owner}` : ""}</span>
            </div>
          </Link>
        ))}
        <NewCollectionDialog />
      </div>

      {recent.length > 0 ? (
        <>
          <div className="section-head">
            <h2>Recently kept</h2>
            <div className="meta">Last {recent.length} additions</div>
          </div>
          <div className="masonry" style={{ columnCount: 3 }}>
            {recent.map((item) => (
              <Link key={item.id} href={`/items/${item.id}`} className="card">
                <ItemPhoto
                  placeholder={item.placeholder}
                  label={item.name.split(" ")[0]}
                  aspect="4/5"
                />
                <div className="caption">
                  <div>
                    <div className="name serif">{item.name}</div>
                    {item.collectionName ? (
                      <div className="sub">{item.collectionName}</div>
                    ) : null}
                  </div>
                  <div className="meta">{item.acquired ?? "—"}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <div className="footer">
        <span>Kept · A personal archive</span>
        <span>Keep what matters</span>
      </div>

      <TweaksPanel />
    </div>
  );
}
