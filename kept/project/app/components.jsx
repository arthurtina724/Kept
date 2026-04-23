// Shared components for HomeInventory

const { useState, useEffect, useMemo, useRef } = React;

// ---------- Placeholder imagery ----------
// Instead of hand-drawing SVGs, we use CSS gradients + texture for item photos
// so the "placeholder" feel is intentional and editorial.
function ItemPhoto({ item, aspect = "4/5", className = "", onClick }) {
  const seed = item.id || item.name || "x";
  const hue = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const tone = item.tone || `oklch(0.82 0.04 ${hue})`;
  const accent = item.accentTone || `oklch(0.68 0.07 ${(hue + 40) % 360})`;
  const stripes = `repeating-linear-gradient(${item.stripeAngle || 135}deg, ${tone} 0 14px, ${accent} 14px 15px)`;
  return (
    <div
      onClick={onClick}
      className={`item-photo ${className}`}
      style={{
        aspectRatio: aspect,
        background: item.photo
          ? `center/cover no-repeat url("${item.photo}")`
          : stripes,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {!item.photo && (
        <div className="photo-label">
          <span className="mono">{item.photoLabel || "photo"}</span>
        </div>
      )}
    </div>
  );
}

// ---------- Tag chip ----------
function Tag({ children, muted }) {
  return <span className={`tag ${muted ? "tag-muted" : ""}`}>{children}</span>;
}

// ---------- Small icon set (simple geometric only) ----------
const Icons = {
  Plus: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...p}>
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="round" />
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...p}>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  Close: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...p}>
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  Arrow: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...p}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Back: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...p}>
      <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Grid: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...p}>
      <rect x="2" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <rect x="9" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <rect x="2" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <rect x="9" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.25" fill="none" />
    </svg>
  ),
  Pin: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...p}>
      <path d="M8 14v-4M5 3h6l-1 5H6L5 3z" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinejoin="round" />
    </svg>
  ),
  Camera: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" {...p}>
      <rect x="1.5" y="4.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <path d="M5.5 4.5l1-2h3l1 2" stroke="currentColor" strokeWidth="1.25" fill="none" />
    </svg>
  ),
};

Object.assign(window, { ItemPhoto, Tag, Icons });
