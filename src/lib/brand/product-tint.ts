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
 *
 * Priority (skipping any name ending in `-foreground`, `-fg`, or `-text`):
 *   1. exact `primary` (or `--primary`, `color-primary`).
 *   2. brand group + primary/brand keyword.
 *   3. any brand-group color.
 *   4. accent-group color.
 *   5. first color.
 *
 * `mode = "dark"` prefers the color's `darkModeHex` when available so the
 * shell tint also flips with the theme.
 */
export function pickProjectTintColor(
  profile: BrandProfile | null,
  mode: "light" | "dark" = "light",
): string | null {
  if (!profile?.colors?.length) return null;
  const isFg = (name: string) => /-(foreground|fg|text)$/i.test(name);
  const palette = profile.colors.filter((c) => !isFg(c.name));
  const valueOf = (c: (typeof profile.colors)[number]): string | null => {
    if (mode === "dark" && c.darkModeHex) return c.darkModeHex;
    return c.value || null;
  };

  const exactPrimary = palette.find(
    (c) =>
      c.name === "primary" ||
      c.cssVariable === "--primary" ||
      c.cssVariable === "--color-primary" ||
      c.name === "color-primary",
  );
  if (exactPrimary) {
    const v = valueOf(exactPrimary);
    if (v) return v;
  }

  const brandPrimary = palette.find(
    (c) => c.group === "brand" && /primary|brand|accent|main/i.test(c.name),
  );
  if (brandPrimary) {
    const v = valueOf(brandPrimary);
    if (v) return v;
  }

  const anyBrand = palette.find((c) => c.group === "brand");
  if (anyBrand) {
    const v = valueOf(anyBrand);
    if (v) return v;
  }

  const anyAccent = palette.find((c) => c.group === "accent");
  if (anyAccent) {
    const v = valueOf(anyAccent);
    if (v) return v;
  }

  return valueOf(palette[0] ?? profile.colors[0]) ?? null;
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
