"use client";

import * as React from "react";

type Variant = "paper" | "ink" | "gallery";
type Accent = "terracotta" | "olive" | "ink";
type Density = "airy" | "default" | "tight";

type Tweaks = { variant: Variant; accent: Accent; density: Density };

const DEFAULTS: Tweaks = { variant: "paper", accent: "terracotta", density: "default" };

function loadTweaks(): Tweaks {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem("kept_tweaks");
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function TweaksPanel() {
  const [open, setOpen] = React.useState(false);
  const [tweaks, setTweaks] = React.useState<Tweaks>(DEFAULTS);

  React.useEffect(() => {
    const t = loadTweaks();
    setTweaks(t);
    document.documentElement.setAttribute("data-theme", t.variant);
  }, []);

  const update = (patch: Partial<Tweaks>) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    window.localStorage.setItem("kept_tweaks", JSON.stringify(next));
    document.documentElement.setAttribute("data-theme", next.variant);
  };

  if (!open) {
    return (
      <button className="tw-toggle" onClick={() => setOpen(true)} aria-label="Open tweaks">
        Tweaks
      </button>
    );
  }

  return (
    <div className="tweaks">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 2,
        }}
      >
        <h3>Tweaks</h3>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close tweaks"
          style={{
            background: "none",
            border: "none",
            color: "var(--ink-3)",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ×
        </button>
      </div>
      <div className="h-sub">Adjust visual style</div>

      <div className="tw-group">
        <div className="tw-label">Theme</div>
        <div className="seg">
          {(["paper", "ink", "gallery"] as const).map((v) => (
            <button
              key={v}
              className={tweaks.variant === v ? "on" : ""}
              onClick={() => update({ variant: v })}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="tw-group">
        <div className="tw-label">Accent hue</div>
        <div className="seg">
          {(["terracotta", "olive", "ink"] as const).map((k) => (
            <button
              key={k}
              className={tweaks.accent === k ? "on" : ""}
              onClick={() => update({ accent: k })}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="tw-group">
        <div className="tw-label">Density</div>
        <div className="seg">
          {(["airy", "default", "tight"] as const).map((d) => (
            <button
              key={d}
              className={tweaks.density === d ? "on" : ""}
              onClick={() => update({ density: d })}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
