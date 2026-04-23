import * as React from "react";
import { stripeBackground } from "@/lib/placeholder";
import type { PlaceholderTones } from "@/types/kept";

type Props = {
  placeholder: PlaceholderTones;
  photoUrl?: string | null;
  label?: string | null;
  aspect?: string;
  className?: string;
  active?: boolean;
  onClick?: () => void;
};

export function ItemPhoto({
  placeholder,
  photoUrl,
  label,
  aspect = "4/5",
  className = "",
  active,
  onClick,
}: Props) {
  const bg = photoUrl
    ? `center/cover no-repeat url("${photoUrl}")`
    : stripeBackground(placeholder);
  return (
    <div
      onClick={onClick}
      className={`item-photo${active ? " active" : ""}${className ? " " + className : ""}`}
      style={{
        aspectRatio: aspect,
        background: bg,
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      {!photoUrl && label ? (
        <div className="photo-label">
          <span className="mono">{label}</span>
        </div>
      ) : null}
    </div>
  );
}
