/**
 * Deterministic 9-row typography guide from scanned BrandTypography + BrandFont.
 */

import type { BrandFont, BrandTypography } from "./types";

export type TypographyRole =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "body1"
  | "body2"
  | "caption";

export interface TypographyGuideEntry {
  role: TypographyRole;
  fontFamily: string;
  fontWeight: number;
  fontSizePx: number;
  lineHeightPx: number;
  letterSpacing?: string;
  source: "scanned" | "autodsm-guide";
  tailwindClass?: string;
}

export interface BuildTypographyGuideInput {
  typography: BrandTypography[];
  fonts: BrandFont[];
  baseRemPx?: number;
  ratio?: number;
}

/** Modular scale exponents — larger → bigger type (h1 largest). */
const ROLE_EXP: Record<TypographyRole, number> = {
  caption: -2,
  body2: -1,
  body1: 0,
  h6: 1,
  h5: 2,
  h4: 3,
  h3: 4,
  h2: 5,
  h1: 6,
};

const ROLE_ORDER: TypographyRole[] = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "body1",
  "body2",
  "caption",
];

/** Approximate Tailwind text-* keys → px (defaults). */
const TAILWIND_PX: { key: string; px: number }[] = [
  { key: "text-xs", px: 12 },
  { key: "text-sm", px: 14 },
  { key: "text-base", px: 16 },
  { key: "text-lg", px: 18 },
  { key: "text-xl", px: 20 },
  { key: "text-2xl", px: 24 },
  { key: "text-3xl", px: 30 },
  { key: "text-4xl", px: 36 },
  { key: "text-5xl", px: 48 },
  { key: "text-6xl", px: 60 },
  { key: "text-7xl", px: 72 },
  { key: "text-8xl", px: 96 },
  { key: "text-9xl", px: 128 },
];

function nearestTailwindClass(px: number): string | undefined {
  let best: string | undefined;
  let bestD = 999;
  for (const { key, px: p } of TAILWIND_PX) {
    const d = Math.abs(px - p);
    if (d < bestD) {
      bestD = d;
      best = key;
    }
  }
  return bestD <= 3 ? best : undefined;
}

function stripFontStack(raw: string): string {
  const s = raw.trim();
  const first = s.split(",")[0]?.trim() ?? s;
  return first.replace(/^var\([^)]+\)/, "").replace(/['"]/g, "").trim() || "system-ui, sans-serif";
}

function resolveFamily(fonts: BrandFont[], typography: BrandTypography[]): string {
  const primary = fonts.find((f) => f.role === "primary");
  if (primary?.family) return stripFontStack(primary.family);
  const first = typography[0]?.fontFamily;
  if (first) return stripFontStack(first);
  return "system-ui, sans-serif";
}

function collectWeights(fonts: BrandFont[]): number[] {
  const w = new Set<number>();
  for (const f of fonts) {
    for (const x of f.weights) {
      const n = parseInt(x.value, 10);
      if (!Number.isNaN(n)) w.add(n);
    }
  }
  return [...w].sort((a, b) => a - b);
}

function nearestWeight(wanted: number, available: number[]): number {
  if (available.length === 0) return wanted;
  let best = available[0];
  let bestD = 999;
  for (const a of available) {
    const d = Math.abs(a - wanted);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

function weightForRole(role: TypographyRole, weights: number[]): number {
  const heading = nearestWeight(600, weights);
  const body = nearestWeight(400, weights);
  if (role.startsWith("h")) return heading;
  return body;
}

function lineHeightForRole(role: TypographyRole, sizePx: number): number {
  if (role.startsWith("h")) return Math.round(sizePx * 1.2);
  if (role === "caption") return Math.round(sizePx * 1.4);
  return Math.round(sizePx * 1.5);
}

function pickBasePx(typography: BrandTypography[], baseRemPx: number): number {
  if (typography.length === 0) return baseRemPx;
  let best = typography[0];
  let bestD = Math.abs(typography[0].fontSizePx - baseRemPx);
  for (const t of typography) {
    const d = Math.abs(t.fontSizePx - baseRemPx);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best.fontSizePx;
}

function matchesScanned(
  entry: Pick<
    TypographyGuideEntry,
    "role" | "fontFamily" | "fontWeight" | "fontSizePx" | "lineHeightPx"
  >,
  typography: BrandTypography[],
  family: string,
): boolean {
  const famLower = family.toLowerCase();
  for (const t of typography) {
    if (stripFontStack(t.fontFamily).toLowerCase() !== famLower) continue;
    const ratio = t.fontSizePx / Math.max(entry.fontSizePx, 1);
    if (ratio >= 0.9 && ratio <= 1.1) return true;
  }
  return false;
}

/**
 * Returns 9 typography rows (h1 → h6, body1, body2, caption) using a modular scale.
 */
export function buildTypographyGuide(input: BuildTypographyGuideInput): TypographyGuideEntry[] {
  const baseRemPx = input.baseRemPx ?? 16;
  const ratio = input.ratio ?? 1.2;
  const family = resolveFamily(input.fonts, input.typography);
  const basePx = Math.min(64, Math.max(10, pickBasePx(input.typography, baseRemPx)));
  const weights = collectWeights(input.fonts);

  const entries: TypographyGuideEntry[] = [];
  for (const role of ROLE_ORDER) {
    const exp = ROLE_EXP[role];
    const raw = basePx * ratio ** exp;
    const fontSizePx = Math.min(64, Math.max(10, Math.round(raw)));
    const fontWeight = weightForRole(role, weights);
    const lineHeightPx = lineHeightForRole(role, fontSizePx);
    const tailwindClass = nearestTailwindClass(fontSizePx);
    const baseEntry = {
      role,
      fontFamily: family,
      fontWeight,
      fontSizePx,
      lineHeightPx,
      letterSpacing: role.startsWith("h") ? "-0.02em" : undefined,
      tailwindClass,
    };
    const entry: TypographyGuideEntry = {
      ...baseEntry,
      source: matchesScanned(baseEntry, input.typography, family)
        ? "scanned"
        : "autodsm-guide",
    };
    entries.push(entry);
  }

  return entries;
}
