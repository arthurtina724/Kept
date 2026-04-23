"use client";

import * as React from "react";
import { ItemPhoto } from "@/components/ui/ItemPhoto";
import type { PlaceholderTones } from "@/types/kept";

export function DetailGallery({
  itemId,
  placeholder,
}: {
  itemId: string;
  placeholder: PlaceholderTones;
}) {
  const [active, setActive] = React.useState(0);
  const variants = React.useMemo(
    () =>
      [0, 1, 2, 3].map((i) => ({
        ...placeholder,
        stripeAngle: (placeholder.stripeAngle + i * 30) % 180,
      })),
    [placeholder],
  );
  return (
    <div className="gallery">
      <ItemPhoto placeholder={variants[active]} label={itemId.toUpperCase()} aspect="4/5" />
      <div className="thumbs">
        {variants.map((v, i) => (
          <ItemPhoto
            key={i}
            placeholder={v}
            label={`${i + 1}/4`}
            aspect="1/1"
            active={active === i}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}
