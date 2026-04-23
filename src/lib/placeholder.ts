import type { PlaceholderTones } from "@/types/kept";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function placeholderTones(seed: string): PlaceholderTones {
  const h = hash(seed);
  const hue = h % 360;
  const angle = (h >> 3) % 180;
  return {
    tone: `oklch(0.82 0.04 ${hue})`,
    accentTone: `oklch(0.62 0.1 ${(hue + 40) % 360})`,
    stripeAngle: angle,
  };
}

export function stripeBackground(t: PlaceholderTones): string {
  return `repeating-linear-gradient(${t.stripeAngle}deg, ${t.tone} 0 14px, ${t.accentTone} 14px 15px)`;
}
