"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { deleteItem, duplicateItem } from "@/lib/actions/kept";

export function ItemActions({
  itemId,
  collectionId,
}: {
  itemId: string;
  collectionId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"duplicate" | "delete" | null>(null);

  async function onDuplicate() {
    setBusy("duplicate");
    const res = await duplicateItem(itemId);
    setBusy(null);
    if (res.success) router.push(`/items/${res.data.id}`);
    else alert(res.error);
  }

  async function onDelete() {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setBusy("delete");
    const res = await deleteItem(itemId);
    setBusy(null);
    if (res.success) router.push(`/collections/${collectionId}`);
    else alert(res.error);
  }

  return (
    <div className="actions">
      <button className="btn primary" disabled>
        Edit item
      </button>
      <button
        className="btn ghost"
        onClick={onDuplicate}
        disabled={busy !== null}
      >
        {busy === "duplicate" ? "Duplicating…" : "Duplicate"}
      </button>
      <button
        className="btn ghost"
        onClick={onDelete}
        disabled={busy !== null}
      >
        {busy === "delete" ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
