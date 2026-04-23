// Catalog browse view — Pinterest-style masonry

function BrowseView({ catalogId, onBack, onOpenItem, onAddItem }) {
  const catalog = window.CATALOGS.find((c) => c.id === catalogId);
  const allItems = window.ITEMS.filter((i) => i.catalogId === catalogId);

  const [query, setQuery] = React.useState("");
  const [activeTag, setActiveTag] = React.useState(null);

  const allTags = React.useMemo(() => {
    const counts = {};
    allItems.forEach((i) => (i.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [catalogId]);

  const filtered = React.useMemo(() => {
    return allItems.filter((i) => {
      const q = query.toLowerCase().trim();
      const matchQ =
        !q ||
        i.name.toLowerCase().includes(q) ||
        (i.brand || "").toLowerCase().includes(q) ||
        (i.colorway || "").toLowerCase().includes(q) ||
        (i.tags || []).some((t) => t.includes(q));
      const matchT = !activeTag || (i.tags || []).includes(activeTag);
      return matchQ && matchT;
    });
  }, [query, activeTag, catalogId]);

  return (
    <div className="app">
      <div className="masthead">
        <div className="wordmark">Kept<span className="wm-dot">.</span></div>
        <div className="meta">
          <span><span className="dot"></span>Synced · 2m ago</span>
        </div>
      </div>

      <div className="browse-head">
        <div className="title-block">
          <div className="crumb">
            <a onClick={onBack}>Kept</a>  ·  <span>{catalog.name}</span>
          </div>
          <h1>{catalog.name}</h1>
          <div className="desc">{catalog.description}</div>
        </div>
        <div className="stats" style={{ display: "flex", gap: 40 }}>
          <div className="stat">
            <div style={{ fontFamily: "var(--serif)", fontSize: 44, lineHeight: 1, letterSpacing: "-0.02em" }}>{allItems.length}</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 6 }}>Items</div>
          </div>
          <div className="stat">
            <div style={{ fontFamily: "var(--serif)", fontSize: 44, lineHeight: 1, letterSpacing: "-0.02em" }}>{allTags.length}</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 6 }}>Tags</div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icons.Search style={{ color: "var(--ink-3)" }} />
          <input
            placeholder={`Search within ${catalog.name.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)" }}
            ><Icons.Close /></button>
          )}
        </div>
        <button className="btn primary" onClick={onAddItem}>
          <Icons.Plus /> New item
        </button>
      </div>

      <div className="tag-strip" style={{ marginBottom: 40 }}>
        <button className={`pill ${activeTag === null ? "on" : ""}`} onClick={() => setActiveTag(null)}>
          All ({allItems.length})
        </button>
        {allTags.map(([t, count]) => (
          <button
            key={t}
            className={`pill ${activeTag === t ? "on" : ""}`}
            onClick={() => setActiveTag(activeTag === t ? null : t)}
          >{t} · {count}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--ink-3)", fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic" }}>
          No items match. Try another search.
        </div>
      ) : (
        <div className="masonry">
          {filtered.map((item) => (
            <div key={item.id} className="card" onClick={() => onOpenItem(item.id)}>
              <ItemPhoto item={item} />
              <div className="caption">
                <div>
                  <div className="name serif">{item.name}</div>
                  {item.subtitle && <div className="sub">{item.subtitle}</div>}
                </div>
                {item.size && <div className="meta">{item.size}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="footer">
        <span>Showing {filtered.length} of {allItems.length}</span>
        <span>{catalog.name} · {catalog.owner}</span>
      </div>
    </div>
  );
}

window.BrowseView = BrowseView;
