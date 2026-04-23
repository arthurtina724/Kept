"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { createCollection } from "@/lib/actions/kept";
import { AVAILABLE_FIELDS } from "@/lib/validators/kept";

const FIELD_DESCRIPTIONS: Record<(typeof AVAILABLE_FIELDS)[number], string> = {
  Brand: "e.g. Nike, Adidas",
  Model: "e.g. Air Max 1",
  Colorway: "e.g. White / Red",
  Size: "e.g. US 10, M, 32",
  "Box / Location": "e.g. Attic box A3",
  Room: "e.g. Living room",
  "Year acquired": "e.g. 2024",
  Condition: "New / Worn / Retired",
  Value: "Estimated value",
  Fragile: "Handle with care",
};

export function NewCollectionDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [fields, setFields] = React.useState<Set<(typeof AVAILABLE_FIELDS)[number]>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setName("");
    setDescription("");
    setFields(new Set());
    setError(null);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleField = (f: (typeof AVAILABLE_FIELDS)[number]) => {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const canContinue = step === 1 ? name.trim().length > 0 : true;

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await createCollection({
        name: name.trim(),
        description: description.trim() || undefined,
        fields: Array.from(fields),
      });
      if (!res.success) {
        setError(res.error);
      } else {
        setOpen(false);
        router.push(`/collections/${res.data.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className="catalog-card add" onClick={() => setOpen(true)}>
        <div className="plus">+</div>
        <div className="lbl">New collection</div>
        <div className="lbl-sub">Begin keeping something new</div>
      </button>

      {open ? (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="sub">New collection · Step {step} of 2</div>
            <h2>{step === 1 ? "Begin a new collection" : "Choose fields to track"}</h2>
            <p style={{ color: "var(--ink-2)", margin: "0 0 28px", maxWidth: "52ch" }}>
              {step === 1
                ? "A collection groups related things — sneakers, holiday decor, books, records."
                : "Pick the details you'd like to record for each item. You can change these later."}
            </p>

            {step === 1 ? (
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
            ) : (
              <div className="field-grid">
                {AVAILABLE_FIELDS.map((f) => {
                  const on = fields.has(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      className={`field-chip${on ? " on" : ""}`}
                      onClick={() => toggleField(f)}
                    >
                      <div className="chip-head">
                        <span className="chip-name serif">{f}</span>
                        <span className={`chip-dot${on ? " on" : ""}`}>{on ? "✓" : "+"}</span>
                      </div>
                      <div className="chip-desc mono">{FIELD_DESCRIPTIONS[f]}</div>
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

            {error ? (
              <div
                className="mono"
                style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.08em" }}
              >
                {error}
              </div>
            ) : null}

            <div className="actions">
              {step === 1 ? (
                <>
                  <button className="btn ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn primary"
                    disabled={!canContinue}
                    onClick={() => setStep(2)}
                  >
                    Continue <Icons.Arrow />
                  </button>
                </>
              ) : (
                <>
                  <button className="btn ghost" onClick={() => setStep(1)}>
                    <Icons.Back /> Back
                  </button>
                  <button
                    className="btn primary"
                    disabled={submitting}
                    onClick={onSubmit}
                  >
                    <Icons.Plus /> {submitting ? "Creating…" : "Create collection"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
