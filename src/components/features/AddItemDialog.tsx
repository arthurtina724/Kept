"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { createItem } from "@/lib/actions/kept";
import type { Collection } from "@/types/kept";

type Props = {
  collections: Array<Pick<Collection, "id" | "name" | "fields"> & { itemCount?: number }>;
  initialCollectionId?: string;
  /** Render as self-triggered modal with a button label (default). */
  triggerLabel?: string;
  /** Button className when rendering the trigger. */
  triggerClassName?: string;
};

export function AddItemDialog({
  collections,
  initialCollectionId,
  triggerLabel = "Add item",
  triggerClassName = "btn ghost",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [collectionId, setCollectionId] = React.useState(
    initialCollectionId ?? collections[0]?.id ?? "",
  );
  const [name, setName] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({});
  const [tagsCsv, setTagsCsv] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setCollectionId(initialCollectionId ?? collections[0]?.id ?? "");
    setName("");
    setSubtitle("");
    setFieldValues({});
    setTagsCsv("");
    setError(null);
  }, [open, initialCollectionId, collections]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const selected = collections.find((c) => c.id === collectionId);
  const extraFields = selected?.fields ?? [];

  async function onSave() {
    if (!name.trim() || !selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const tags = tagsCsv
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await createItem({
        collectionId: selected.id,
        name: name.trim(),
        subtitle: subtitle.trim() || undefined,
        fieldValues,
        tags,
      });
      if (!res.success) {
        setError(res.error);
      } else {
        setOpen(false);
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
      <button className={triggerClassName} onClick={() => setOpen(true)}>
        <Icons.Plus /> {triggerLabel}
      </button>
      {open ? (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="sub">New item</div>
            <h2>Keep something {selected ? `in ${selected.name}` : "new"}</h2>
            <p style={{ color: "var(--ink-2)", margin: "0 0 28px", maxWidth: "48ch" }}>
              Capture the essentials. You can edit details later.
            </p>

            <div className="photo-drop" title="Photo upload will be enabled once S3/MinIO is configured">
              <Icons.Camera style={{ color: "var(--ink-3)" }} />
              <div className="lbl">Drop photo or click to upload</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
                JPG, PNG · up to 20MB
              </div>
            </div>

            <div className="field">
              <label>Collection</label>
              <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {typeof c.itemCount === "number" ? ` · ${c.itemCount} items` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Brass star tree topper"
              />
            </div>

            <div className="field">
              <label>Subtitle</label>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Optional — e.g. USA Anniversary"
              />
            </div>

            {extraFields.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: extraFields.length === 1 ? "1fr" : "1fr 1fr",
                  gap: 24,
                }}
              >
                {extraFields.map((f) => (
                  <div key={f} className="field">
                    <label>{f}</label>
                    <input
                      value={fieldValues[f] ?? ""}
                      onChange={(e) =>
                        setFieldValues((prev) => ({ ...prev, [f]: e.target.value }))
                      }
                      placeholder={
                        f === "Brand"
                          ? "Nike"
                          : f === "Size"
                          ? "US 10"
                          : f === "Colorway"
                          ? "White / Red"
                          : f === "Model"
                          ? "Air Max 1"
                          : ""
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="field">
              <label>Tags (comma-separated)</label>
              <input
                value={tagsCsv}
                onChange={(e) => setTagsCsv(e.target.value)}
                placeholder="tree, heirloom, fragile"
              />
            </div>

            {error ? (
              <div
                className="mono"
                style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.08em" }}
              >
                {error}
              </div>
            ) : null}

            <div className="actions">
              <button className="btn ghost" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button
                className="btn primary"
                disabled={!name.trim() || submitting}
                onClick={onSave}
              >
                <Icons.Plus /> {submitting ? "Saving…" : "Save item"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
