import Link from "next/link";
import { notFound } from "next/navigation";
import { getItemWithRelations, getRelatedItems } from "@/lib/db/queries";
import { Masthead } from "@/components/ui/Masthead";
import { DetailGallery } from "@/components/features/DetailGallery";
import { ItemPhoto } from "@/components/ui/ItemPhoto";
import { ItemActions } from "@/components/features/ItemActions";
import { Tag } from "@/components/ui/Tag";
import { Icons } from "@/components/ui/Icons";
import { TweaksPanel } from "@/components/features/TweaksPanel";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItemWithRelations(id);
  if (!item) notFound();

  const related = await getRelatedItems(item.collectionId, item.id, 4);

  const fv = item.fieldValues ?? {};
  const fieldEntries = Object.entries(fv).filter(([, v]) => v && v.length > 0);
  const wideKeys = new Set(["Colorway", "Box / Location", "Notes"]);

  return (
    <div className="app">
      <Masthead />

      <div className="detail">
        <DetailGallery itemId={item.id} placeholder={item.placeholder} />

        <div className="info">
          <Link href={`/collections/${item.collection.id}`} className="back">
            <Icons.Back /> Back to {item.collection.name}
          </Link>

          {fv["Brand"] ? <div className="brand">{fv["Brand"]}</div> : null}
          <h1>{item.name}</h1>
          {item.subtitle ? <div className="subtitle">{item.subtitle}</div> : null}

          <div className="fields">
            {fieldEntries.map(([k, v]) => (
              <div key={k} className={`f${wideKeys.has(k) ? " wide" : ""}`}>
                <div className="k">{k}</div>
                <div className="v serif">{v}</div>
              </div>
            ))}
            {item.acquired ? (
              <div className="f">
                <div className="k">Acquired</div>
                <div className="v serif">{item.acquired}</div>
              </div>
            ) : null}
            <div className="f">
              <div className="k">Collection</div>
              <div className="v serif">
                <Link href={`/collections/${item.collection.id}`}>
                  {item.collection.name} →
                </Link>
              </div>
            </div>
            <div className="f">
              <div className="k">Item ID</div>
              <div className="v mono" style={{ fontSize: 13 }}>
                {item.id.toUpperCase()}
              </div>
            </div>
          </div>

          {item.tags.length > 0 ? (
            <div className="tags-block">
              <div className="lbl">Tags</div>
              <div>
                {item.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </div>
          ) : null}

          {item.notes ? (
            <div className="tags-block">
              <div className="lbl">Notes</div>
              <div style={{ color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{item.notes}</div>
            </div>
          ) : null}

          <ItemActions itemId={item.id} collectionId={item.collection.id} />
        </div>
      </div>

      {related.length > 0 ? (
        <>
          <div style={{ marginTop: 96 }} className="section-head">
            <h2>From the same collection</h2>
            <div className="meta">{item.collection.name}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
            {related.map((it) => (
              <Link key={it.id} href={`/items/${it.id}`} className="card">
                <ItemPhoto placeholder={it.placeholder} label={it.name.split(" ")[0]} aspect="1/1" />
                <div className="caption">
                  <div className="name serif" style={{ fontSize: 16 }}>
                    {it.name}
                  </div>
                  {it.caption ? <div className="meta">{it.caption}</div> : null}
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <div className="footer">
        <span>Item · {item.id}</span>
        <span>{item.collection.name}</span>
      </div>

      <TweaksPanel />
    </div>
  );
}
