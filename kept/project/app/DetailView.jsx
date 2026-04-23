// Item detail view

function DetailView({ itemId, onBack, onOpenCatalog }) {
  const item = window.ITEMS.find((i) => i.id === itemId);
  const catalog = window.CATALOGS.find((c) => c.id === item.catalogId);

  const [activeTh, setActiveTh] = React.useState(0);

  // Related items from same catalog
  const related = window.ITEMS.filter((i) => i.catalogId === item.catalogId && i.id !== item.id).slice(0, 4);

  return (
    <div className="app">
      <div className="masthead">
        <div className="wordmark">Kept<span className="wm-dot">.</span></div>
        <div className="meta">
          <span><span className="dot"></span>Synced · 2m ago</span>
        </div>
      </div>

      <div className="detail">
        <div className="gallery">
          <ItemPhoto item={item} aspect="4/5" />
          <div className="thumbs">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`item-photo ${activeTh === i ? "active" : ""}`}
                style={{
                  background: `repeating-linear-gradient(${(item.stripeAngle || 0) + i * 30}deg, ${item.tone} 0 12px, ${item.accentTone} 12px 13px)`,
                  aspectRatio: "1/1",
                  cursor: "pointer",
                }}
                onClick={() => setActiveTh(i)}
              >
                <div className="photo-label"><span className="mono">{i + 1}/4</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="info">
          <button className="back" onClick={onBack}>
            <Icons.Back /> Back to {catalog.name}
          </button>

          {item.brand && <div className="brand">{item.brand}</div>}
          <h1>{item.name}</h1>
          {item.subtitle && <div className="subtitle">{item.subtitle}</div>}

          <div className="fields">
            {item.brand && (
              <div className="f">
                <div className="k">Brand</div>
                <div className="v serif">{item.brand}</div>
              </div>
            )}
            {item.model && (
              <div className="f">
                <div className="k">Model</div>
                <div className="v serif">{item.model}</div>
              </div>
            )}
            {item.colorway && (
              <div className="f wide">
                <div className="k">Colorway</div>
                <div className="v serif">{item.colorway}</div>
              </div>
            )}
            {item.size && (
              <div className="f">
                <div className="k">Size</div>
                <div className="v serif">{item.size}</div>
              </div>
            )}
            {item.acquired && (
              <div className="f">
                <div className="k">Acquired</div>
                <div className="v serif">{item.acquired}</div>
              </div>
            )}
            <div className="f">
              <div className="k">Catalog</div>
              <div className="v serif" style={{ cursor: "pointer" }} onClick={() => onOpenCatalog(catalog.id)}>
                {catalog.name} →
              </div>
            </div>
            <div className="f">
              <div className="k">Item ID</div>
              <div className="v mono" style={{ fontSize: 13 }}>{item.id.toUpperCase()}</div>
            </div>
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="tags-block">
              <div className="lbl">Tags</div>
              <div>
                {item.tags.map((t) => <Tag key={t}>{t}</Tag>)}
              </div>
            </div>
          )}

          <div className="actions">
            <button className="btn primary">Edit item</button>
            <button className="btn ghost">Duplicate</button>
            <button className="btn ghost">Delete</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 96 }} className="section-head">
        <h2>From the same catalog</h2>
        <div className="meta">{catalog.name}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
        {related.map((it) => (
          <div key={it.id} className="card" style={{ cursor: "pointer" }} onClick={() => window.__openItem(it.id)}>
            <ItemPhoto item={it} aspect="1/1" />
            <div className="caption">
              <div className="name serif" style={{ fontSize: 16 }}>{it.name}</div>
              {it.size && <div className="meta">{it.size}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="footer">
        <span>Item · {item.id}</span>
        <span>{catalog.name}</span>
      </div>
    </div>
  );
}

window.DetailView = DetailView;
