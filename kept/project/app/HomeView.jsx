// Home dashboard view

const { useMemo: useMemoHome } = React;

function HomeView({ onOpenCatalog, onAddItem, onNewCatalog }) {
  const catalogs = window.CATALOGS;
  const items = window.ITEMS;

  const totalItems = items.length;
  const totalTags = new Set(items.flatMap((i) => i.tags || [])).size;

  // Recent additions — last 6 items
  const recent = items.slice(-6).reverse();

  // For each catalog, grab first 3 items as mosaic tiles
  const previews = useMemoHome(() => {
    return catalogs.map((c) => {
      const cItems = items.filter((i) => i.catalogId === c.id).slice(0, 3);
      return { catalog: c, items: cItems };
    });
  }, []);

  return (
    <div className="app">
      <div className="masthead">
        <div className="wordmark">Kept<span className="wm-dot">.</span></div>
        <div className="meta">
          <span><span className="dot"></span>Synced · 2m ago</span>
          <span>Vol. I — Spring 2026</span>
        </div>
      </div>

      <div className="hero">
        <h1>
          The things <em>worth keeping</em>, kept.
        </h1>
        <div className="stats">
          <div className="stat">
            <div className="num">{catalogs.length.toString().padStart(2, "0")}</div>
            <div className="lbl">Collections</div>
          </div>
          <div className="stat">
            <div className="num">{totalItems}</div>
            <div className="lbl">Items</div>
          </div>
          <div className="stat">
            <div className="num">{totalTags}</div>
            <div className="lbl">Tags</div>
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2>Collections</h2>
        <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
          <button className="btn ghost" onClick={onAddItem} style={{ padding: "10px 16px" }}>
            <Icons.Plus /> Add item
          </button>
        </div>
      </div>

      <div className="catalogs">
        {previews.map(({ catalog, items: cItems }, idx) => (
          <button
            key={catalog.id}
            className="catalog-card"
            onClick={() => onOpenCatalog(catalog.id)}
          >
            <div className="cover">
              <div className="mosaic">
                {[0, 1, 2].map((i) => {
                  const it = cItems[i];
                  if (!it) return <div key={i} className="tile" style={{ background: catalog.coverTone }} />;
                  const hue = [...(it.id)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
                  const stripes = `repeating-linear-gradient(${it.stripeAngle || 135}deg, ${it.tone} 0 14px, ${it.accentTone} 14px 15px)`;
                  return <div key={i} className="tile" style={{ background: stripes }} />;
                })}
              </div>
              <div className="stamp">№ {String(idx + 1).padStart(2, "0")}</div>
            </div>
            <div className="cat-name serif">{catalog.name}</div>
            <div className="cat-desc">{catalog.description}</div>
            <div className="cat-meta">
              <span>{catalog.itemCount} items</span>
              <span>Est. {catalog.owner}</span>
            </div>
          </button>
        ))}
        <button className="catalog-card add" onClick={onNewCatalog}>
          <div className="plus">+</div>
          <div className="lbl">New collection</div>
          <div className="lbl-sub">Begin keeping something new</div>
        </button>
      </div>

      <div className="section-head">
        <h2>Recently kept</h2>
        <div className="meta">Last 6 additions</div>
      </div>

      <div className="masonry" style={{ columnCount: 3 }}>
        {recent.map((item) => {
          const catalog = catalogs.find((c) => c.id === item.catalogId);
          return (
            <div key={item.id} className="card" onClick={() => window.__openItem(item.id)}>
              <ItemPhoto item={item} aspect="4/5" />
              <div className="caption">
                <div>
                  <div className="name serif">{item.name}</div>
                  <div className="sub">{catalog?.name}</div>
                </div>
                <div className="meta">{item.acquired || "—"}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="footer">
        <span>Kept · A personal archive</span>
        <span>Keep what matters</span>
      </div>
    </div>
  );
}

window.HomeView = HomeView;
