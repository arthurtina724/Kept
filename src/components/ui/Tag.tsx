import * as React from "react";

export function Tag({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return <span className={`tag${muted ? " tag-muted" : ""}`}>{children}</span>;
}
