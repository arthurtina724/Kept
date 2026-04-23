"use client";

import * as React from "react";
import Link from "next/link";
import { Icons } from "@/components/ui/Icons";
import { ItemPhoto } from "@/components/ui/ItemPhoto";
import type { ItemCard } from "@/types/kept";

type CardWithTags = ItemCard & { tags: string[] };

export function BrowseGrid({
  items,
  tagCounts,
}: {
  items: CardWithTags[];
  tagCounts: Array<{ name: string; count: number }>;
}) {
  const [query, setQuery] = React.useState("");
  const [activeTag, setActiveTag] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((i) => {
      const matchQ =
        !q ||
        i.name.toLowerCase().includes(q) ||
        (i.subtitle ?? "").toLowerCase().includes(q) ||
        (i.caption ?? "").toLowerCase().includes(q) ||
        i.tags.some((t) => t.includes(q));
      const matchT = !activeTag || i.tags.includes(activeTag);
      return matchQ && matchT;
    });
  }, [items, query, activeTag]);

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Icons.Search style={{ color: "var(--ink-3)" }} />
          <input
            placeholder="Search within collection…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink-3)",
              }}
              aria-label="Clear"
            >
              <Icons.Close />
            </button>
          ) : null}
        </div>
      </div>

      <div className="tag-strip" style={{ marginBottom: 40 }}>
        <button
          className={`pill${activeTag === null ? " on" : ""}`}
          onClick={() => setActiveTag(null)}
        >
          All ({items.length})
        </button>
        {tagCounts.map((t) => (
          <button
            key={t.name}
            className={`pill${activeTag === t.name ? " on" : ""}`}
            onClick={() => setActiveTag(activeTag === t.name ? null : t.name)}
          >
            {t.name} · {t.count}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: "80px 0",
            textAlign: "center",
            color: "var(--ink-3)",
            fontFamily: "var(--serif)",
            fontSize: 22,
            fontStyle: "italic",
          }}
        >
          No items match. Try another search.
        </div>
      ) : (
        <div className="masonry">
          {filtered.map((item) => (
            <Link key={item.id} href={`/items/${item.id}`} className="card">
              <ItemPhoto placeholder={item.placeholder} label={item.name.split(" ")[0]} />
              <div className="caption">
                <div>
                  <div className="name serif">{item.name}</div>
                  {item.subtitle ? <div className="sub">{item.subtitle}</div> : null}
                </div>
                {item.caption ? <div className="meta">{item.caption}</div> : null}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div
        className="mono"
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: "1px solid var(--rule)",
          color: "var(--ink-3)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Showing {filtered.length} of {items.length}
      </div>
    </>
  );
}
