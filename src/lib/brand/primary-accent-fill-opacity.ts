import { parse, wcagLuminance } from "culori";

const MIN_OPACITY = 0.04;
const MAX_OPACITY = 0.12;
/** Hover overlay is always this much more opaque than the computed base. */
const HOVER_DELTA = 0.12;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/**
 * Dashboard category tiles use a wash of `var(--accent)` over `--bg-elevated`.
 * Maps the scanned primary (brand) hex to base/hover opacities in [0.04, 0.12] for base,
 * with hover = base + 0.12 (capped at 1), using WCAG luminance so light vs dark brand
 * colors get appropriately visible tints on neutral cards.
 */
export function primaryAccentFillOpacity(hex: string | null | undefined): {
  baseOpacity: number;
  hoverOpacity: number;
} {
  const fallback = {
    baseOpacity: MIN_OPACITY,
    hoverOpacity: Math.min(1, MIN_OPACITY + HOVER_DELTA),
  };
  if (!hex?.trim()) return fallback;
  const p = parse(hex.trim());
  if (!p) return fallback;
  const L = wcagLuminance(p);
  const t = clamp01(L);
  const baseOpacity = MIN_OPACITY + t * (MAX_OPACITY - MIN_OPACITY);
  const hoverOpacity = Math.min(1, baseOpacity + HOVER_DELTA);
  return { baseOpacity, hoverOpacity };
}
