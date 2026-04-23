// Modals: AddItem, NewCatalog + Tweaks panel

function AddItemModal({ open, onClose, onSave, initialCatalogId }) {
  const [catalogId, setCatalogId] = React.useState(initialCatalogId || window.CATALOGS[0].id);
  const [name, setName] = React.useState("");
  const [fieldValues, setFieldValues] = React.useState({});
  const [tags, setTags] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setCatalogId(initialCatalogId || window.CATALOGS[0].id);
      setName(""); setFieldValues({}); setTags("");
    }
  }, [open, initialCatalogId]);

  if (!open) return null;

  const catalog = window.CATALOGS.find((c) => c.id === catalogId);
  // show all fields except "Name" & "Tags" (those are rendered separately)
  const extraFields = (catalog.fields || []).filter((f) => !["Name", "Tags"].includes(f));

  const setFV = (k, v) => setFieldValues((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sub">New item</div>
        <h2>Keep something in {catalog.name}</h2>
        <p style={{ color: "var(--ink-2)", margin: "0 0 28px", maxWidth: "48ch" }}>
          Capture the essentials. You can edit details later.
        </p>

        <div className="photo-drop">
          <Icons.Camera style={{ color: "var(--ink-3)" }} />
          <div className="lbl">Drop photo or click to upload</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
            JPG, PNG · up to 20MB
          </div>
        </div>

        <div className="field">
          <label>Collection</label>
          <select value={catalogId} onChange={(e) => setCatalogId(e.target.value)}>
            {window.CATALOGS.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.itemCount} items</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Name</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brass star tree topper" />
        </div>

        {extraFields.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: extraFields.length === 1 ? "1fr" : "1fr 1fr", gap: 24 }}>
            {extraFields.map((f) => (
              <div key={f} className="field">
                <label>{f}</label>
                <input
                  value={fieldValues[f] || ""}
                  onChange={(e) => setFV(f, e.target.value)}
                  placeholder={f === "Brand" ? "Nike" : f === "Size" ? "US 10" : f === "Colorway" ? "White / Red" : f === "Model" ? "Air Max 1" : ""}
                />
              </div>
            ))}
          </div>
        )}

        <div className="field">
          <label>Tags (comma-separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tree, heirloom, fragile" />
        </div>

        <div className="actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            disabled={!name.trim()}
            style={!name.trim() ? { opacity: 0.4, cursor: "not-allowed" } : {}}
            onClick={() => { onSave({ catalogId, name, fieldValues, tags }); onClose(); }}
          >
            <Icons.Plus /> Save item
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- New Catalog modal ----------
const AVAILABLE_FIELDS = [
  { k: "Brand", desc: "e.g. Nike, Adidas" },
  { k: "Model", desc: "e.g. Air Max 1" },
  { k: "Colorway", desc: "e.g. White / Red" },
  { k: "Size", desc: "e.g. US 10, M, 32" },
  { k: "Box / Location", desc: "e.g. Attic box A3" },
  { k: "Room", desc: "e.g. Living room" },
  { k: "Year acquired", desc: "e.g. 2024" },
  { k: "Condition", desc: "New / Worn / Retired" },
  { k: "Value", desc: "Estimated value" },
  { k: "Fragile", desc: "Handle with care" },
];

function NewCatalogModal({ open, onClose, onSave }) {
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [fields, setFields] = React.useState(new Set(["Tags"]));

  React.useEffect(() => {
    if (open) { setStep(1); setName(""); setDescription(""); setFields(new Set(["Tags"])); }
  }, [open]);

  if (!open) return null;

  const toggleField = (f) => {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  const canContinue = step === 1 ? name.trim().length > 0 : true;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sub">New collection · Step {step} of 2</div>
        <h2>{step === 1 ? "Begin a new collection" : "Choose fields to track"}</h2>
        <p style={{ color: "var(--ink-2)", margin: "0 0 28px", maxWidth: "52ch" }}>
          {step === 1
            ? "A collection groups related things — sneakers, holiday decor, books, records."
            : "Pick the details you'd like to record for each item. You can change these later."}
        </p>

        {step === 1 && (
          <>
            <div className="field">
              <label>Collection name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kitchenware, Books, Vinyl"
              />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short note about what lives here"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="field-grid">
            {AVAILABLE_FIELDS.map((f) => {
              const on = fields.has(f.k);
              return (
                <button
                  key={f.k}
                  type="button"
                  className={`field-chip ${on ? "on" : ""}`}
                  onClick={() => toggleField(f.k)}
                >
                  <div className="chip-head">
                    <span className="chip-name serif">{f.k}</span>
                    <span className={`chip-dot ${on ? "on" : ""}`}>{on ? "✓" : "+"}</span>
                  </div>
                  <div className="chip-desc mono">{f.desc}</div>
                </button>
              );
            })}
            <div className="field-chip on static">
              <div className="chip-head">
                <span className="chip-name serif">Tags</span>
                <span className="chip-dot on">✓</span>
              </div>
              <div className="chip-desc mono">Always included · free-form labels</div>
            </div>
          </div>
        )}

        <div className="actions">
          {step === 1 ? (
            <>
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button
                className="btn primary"
                disabled={!canContinue}
                style={!canContinue ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                onClick={() => setStep(2)}
              >
                Continue <Icons.Arrow />
              </button>
            </>
          ) : (
            <>
              <button className="btn ghost" onClick={() => setStep(1)}><Icons.Back /> Back</button>
              <button
                className="btn primary"
                onClick={() => { onSave({ name, description, fields: Array.from(fields) }); onClose(); }}
              >
                <Icons.Plus /> Create collection
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TweaksPanel({ visible, variant, density, accent, onChange }) {
  if (!visible) return null;
  return (
    <div className="tweaks">
      <h3>Tweaks</h3>
      <div className="h-sub">Adjust visual style</div>

      <div className="tw-group">
        <div className="tw-label">Theme</div>
        <div className="seg">
          {["paper", "ink", "gallery"].map((v) => (
            <button key={v} className={variant === v ? "on" : ""} onClick={() => onChange({ variant: v })}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="tw-group">
        <div className="tw-label">Accent hue</div>
        <div className="seg">
          {[
            { k: "terracotta", hue: 38 },
            { k: "olive", hue: 120 },
            { k: "ink", hue: 260 },
          ].map(({ k, hue }) => (
            <button key={k} className={accent === k ? "on" : ""} onClick={() => onChange({ accent: k, accentHue: hue })}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="tw-group">
        <div className="tw-label">Density</div>
        <div className="seg">
          {["airy", "default", "tight"].map((d) => (
            <button key={d} className={density === d ? "on" : ""} onClick={() => onChange({ density: d })}>
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

window.AddItemModal = AddItemModal;
window.NewCatalogModal = NewCatalogModal;
window.TweaksPanel = TweaksPanel;
