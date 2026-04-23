/**
 * Product shell tint: maps the scanned project's brand color to CSS custom properties,
 * with WCAG 2.1 AA (4.5:1) for text/icons on solid accent, and 8% tint on elevated
 * / card surfaces via color-mix. Pairs with `.light` / .dark` on <html> (next-themes).
 */
import type { CSSProperties } from "react";
import { converter, formatHex, parse, wcagContrast, type Color } from "culori";
import type { BrandProfile } from "./types";

const toOklch = converter("oklch");
const ON_ACCENT_CANDIDATES = ["#ffffff", "#0a0a0b", "#f5f5f7", "#111113", "#000000"] as const;
const AA_NORMAL = 4.5;
const AA_LARGE = 3;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Picks a single "tint" hex for the app chrome from a BrandProfile.
 * Priority: brand + primary/brand in name, then any brand, accent, else first color.
 */
export function pickProjectTintColor(profile: BrandProfile | null): string | null {
  if (!profile?.colors?.length) return null;
  const { colors } = profile;
  const brandPrimary = colors.find(
    (c) => c.group === "brand" && /primary|brand|accent|main/i.test(c.name),
  );
  if (brandPrimary?.value) return brandPrimary.value;
  const anyBrand = colors.find((c) => c.group === "brand");
  if (anyBrand?.value) return anyBrand.value;
  const anyAccent = colors.find((c) => c.group === "accent");
  if (anyAccent?.value) return anyAccent.value;
  return colors[0].value;
}

/**
 * Picks a foreground for solid accent (buttons, focus ring partner) with ≥4.5:1 vs fill.
 * If the raw tint is too mid-tone, nudges OKLCH L until a candidate passes.
 */
export function resolveAccentOnAccent(
  baseHex: string,
): { accent: string; onAccent: string } {
  for (const fg of ON_ACCENT_CANDIDATES) {
    if (wcagContrast(fg, baseHex) >= AA_NORMAL) {
      return { accent: baseHex, onAccent: fg };
    }
  }

  const p = parse(baseHex);
  if (!p) return { accent: baseHex, onAccent: "#ffffff" };
  const seed = toOklch(p) as Color & { l?: number; c?: number; h?: number };
  for (const dir of [-1, 1] as const) {
    const c0: Color = {
      mode: "oklch",
      l: seed.l,
      c: seed.c,
      h: seed.h,
    } as Color;
    for (let i = 0; i < 36; i++) {
      c0.l = clamp01((c0.l ?? 0) + dir * 0.025);
      if (c0.l! <= 0.01 || c0.l! >= 0.99) break;
      const hx = formatHex(c0);
      if (!hx) continue;
      for (const fg of ON_ACCENT_CANDIDATES) {
        if (wcagContrast(fg, hx) >= AA_NORMAL) {
          return { accent: hx, onAccent: fg };
        }
      }
    }
  }
  // Last resort: push darker so #ffffff is more likely to pass
  return { accent: adjustLightness(baseHex, -0.2), onAccent: "#ffffff" };
}

function adjustLightness(hex: string, delta: number): string {
  const p = parse(hex);
  if (!p) return hex;
  const o = toOklch(p) as Color & { l?: number };
  o.l = clamp01((o.l ?? 0) + delta);
  return formatHex(o) ?? hex;
}

/**
 * In light mode, hovers/presses go slightly darker. In dark mode, hover is lighter, pressed is darker.
 */
function accentStop(hex: string, mode: "light" | "dark", role: "hover" | "pressed"): string {
  if (mode === "light") {
    const d = role === "hover" ? -0.045 : -0.08;
    return adjustLightness(hex, d);
  }
  const d = role === "hover" ? 0.05 : -0.055;
  return adjustLightness(hex, d);
}

/** 8% project chroma on the page background (used by cards / elevated / popover in tint scope). */
function elevatedFromBg(): string {
  return "color-mix(in oklch, var(--project-tint) 8%, var(--bg-primary) 92%)";
}

function accentSubtleString(mode: "light" | "dark"): string {
  if (mode === "light") {
    return "color-mix(in oklch, var(--project-tint) 10%, #ffffff 90%)";
  }
  return "color-mix(in oklch, var(--project-tint) 14%, var(--bg-primary) 86%)";
}

/**
 * Build CSS custom properties to replace the default purple chrome with the project tint.
 */
export function buildProjectTintStyle(
  tintHex: string,
  mode: "light" | "dark",
): CSSProperties {
  const { accent, onAccent } = resolveAccentOnAccent(tintHex);
  const hover = accentStop(accent, mode, "hover");
  const pressed = accentStop(accent, mode, "pressed");
  const subtle = accentSubtleString(mode);
  const elevated = elevatedFromBg();
  const focusRing = "0 0 0 2px var(--bg-primary), 0 0 0 4px var(--accent)";

  return {
    "--project-tint": tintHex,
    "--accent": accent,
    "--accent-fg": onAccent,
    "--primary-foreground": onAccent,
    "--sidebar-primary-foreground": onAccent,
    "--accent-hover": hover,
    "--accent-pressed": pressed,
    "--accent-subtle": subtle,
    "--bg-elevated": elevated,
    "--card": elevated,
    "--popover": elevated,
    "--purple-500": accent,
    "--purple-400": hover,
    "--purple-600": pressed,
    "--purple-50": mode === "light" ? subtle : "color-mix(in oklch, var(--project-tint) 8%, #ffffff 92%)",
    "--purple-950":
      mode === "dark" ? "color-mix(in oklch, var(--project-tint) 20%, var(--bg-primary) 80%)" : subtle,
    "--color-brand": accent,
    "--color-brand-hover": hover,
    "--color-brand-pressed": pressed,
    "--color-brand-subtle": subtle,
    "--color-brand-fg": onAccent,
    "--ring": accent,
    "--sidebar-primary": accent,
    "--sidebar-ring": accent,
    "--chart-1": accent,
    "--chart-2": hover,
    "--primary": accent,
    "--focus-ring-shadow": focusRing,
  } as CSSProperties;
}

export function meetsAaLargeTextOnAccent(accentHex: string, fg: string): boolean {
  return wcagContrast(fg, accentHex) >= AA_LARGE;
}
