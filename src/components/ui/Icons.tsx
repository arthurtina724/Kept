import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

function Svg({ children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} {...rest}>
      {children}
    </svg>
  );
}

export const Icons = {
  Plus: (p: IconProps) => (
    <Svg {...p}>
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="round" />
    </Svg>
  ),
  Search: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  ),
  Close: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  ),
  Arrow: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Back: (p: IconProps) => (
    <Svg {...p}>
      <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.25" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  Grid: (p: IconProps) => (
    <Svg {...p}>
      <rect x="2" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <rect x="9" y="2" width="5" height="5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <rect x="2" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <rect x="9" y="9" width="5" height="5" stroke="currentColor" strokeWidth="1.25" fill="none" />
    </Svg>
  ),
  Camera: (p: IconProps) => (
    <Svg {...p}>
      <rect x="1.5" y="4.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <path d="M5.5 4.5l1-2h3l1 2" stroke="currentColor" strokeWidth="1.25" fill="none" />
    </Svg>
  ),
};
