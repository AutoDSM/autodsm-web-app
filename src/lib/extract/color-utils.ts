/**
 * color-utils.ts — Color conversion and classification utilities.
 * Uses culori for all math (WCAG 2.1, HSL, RGB).
 * PDF §10 — Color post-processing
 */

import {
  parse,
  formatHex,
  formatHsl,
  converter,
  wcagContrast,
  type Color,
  type ColorHsl,
  type ColorRgb,
  type ColorOklch,
} from "culori";
import type { ColorGroup } from "@/lib/brand/types";

// Lazy converters
const toHslSpace = converter("hsl");
const toRgbSpace = converter("rgb");
const toOklchSpace = converter("oklch");

// ─── Shadcn-style "H S% L%" unquoted string ──────────────────────────────────
const SHADCN_PATTERN = /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/;

/**
 * Normalise any CSS color string (including shadcn "H S% L%" bare format
 * and var(--foo) references) into a culori Color object, or null.
 */
function parseSafe(
  value: string,
  varMap?: Record<string, string>
): Color | null {
  if (!value) return null;
  const trimmed = value.trim();

  // Resolve CSS variable references
  if (trimmed.startsWith("var(")) {
    if (!varMap) return null;
    const match = trimmed.match(/^var\(([^,)]+)(?:,([^)]+))?\)/);
    if (!match) return null;
    const varName = match[1].trim();
    const resolved = varMap[varName];
    if (!resolved) return null;
    return parseSafe(resolved, varMap);
  }

  // Shadcn bare "H S% L%" format — wrap in hsl()
  const shadcn = trimmed.match(SHADCN_PATTERN);
  if (shadcn) {
    const wrapped = `hsl(${shadcn[1]} ${shadcn[2]}% ${shadcn[3]}%)`;
    try {
      return parse(wrapped) ?? null;
    } catch {
      return null;
    }
  }

  // Try standard CSS parsing
  try {
    return parse(trimmed) ?? null;
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Convert any CSS color to "#RRGGBB", or null if unparseable.
 * Accepts hex, rgb(), hsl(), oklch(), shadcn "H S% L%", var(--foo) with map.
 */
export function toHex(
  value: string,
  varMap?: Record<string, string>
): string | null {
  const color = parseSafe(value, varMap);
  if (!color) return null;
  try {
    return formatHex(color) ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert to "H S% L%" shadcn-style string (no hsl() wrapper).
 * Returns "" on failure.
 */
export function toHsl(
  value: string,
  varMap?: Record<string, string>
): string {
  const color = parseSafe(value, varMap);
  if (!color) return "";
  try {
    const hsl = toHslSpace(color) as ColorHsl;
    if (!hsl) return "";
    const h = Math.round((hsl.h ?? 0) * 10) / 10;
    const s = Math.round((hsl.s ?? 0) * 1000) / 10; // 0-1 → 0-100, 1dp
    const l = Math.round((hsl.l ?? 0) * 1000) / 10;
    return `${h} ${s}% ${l}%`;
  } catch {
    return "";
  }
}

/**
 * Convert to "rgb(r, g, b)" string.
 * Returns "" on failure.
 */
export function toRgbString(
  value: string,
  varMap?: Record<string, string>
): string {
  const color = parseSafe(value, varMap);
  if (!color) return "";
  try {
    const rgb = toRgbSpace(color) as ColorRgb;
    if (!rgb) return "";
    const r = Math.round((rgb.r ?? 0) * 255);
    const g = Math.round((rgb.g ?? 0) * 255);
    const b = Math.round((rgb.b ?? 0) * 255);
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return "";
  }
}

/**
 * Convert to "oklch(L C H)" string, or undefined if not oklch source.
 */
export function toOklchString(
  value: string,
  varMap?: Record<string, string>
): string | undefined {
  const color = parseSafe(value, varMap);
  if (!color) return undefined;
  if (color.mode !== "oklch") return undefined;
  try {
    const ok = toOklchSpace(color) as ColorOklch;
    if (!ok) return undefined;
    const l = Math.round((ok.l ?? 0) * 10000) / 10000;
    const c = Math.round((ok.c ?? 0) * 10000) / 10000;
    const h = Math.round((ok.h ?? 0) * 100) / 100;
    return `oklch(${l} ${c} ${h})`;
  } catch {
    return undefined;
  }
}

/**
 * WCAG 2.1 contrast ratio between two color strings.
 * Returns 1 on failure (safest fallback).
 */
export function contrastRatio(
  foreground: string,
  background: string,
  varMap?: Record<string, string>
): number {
  try {
    const fg = toHex(foreground, varMap) ?? foreground;
    const bg = toHex(background, varMap) ?? background;
    return wcagContrast(fg, bg) ?? 1;
  } catch {
    return 1;
  }
}

// ─── Color group classification ───────────────────────────────────────────────

/**
 * Classify a CSS custom property name + value into a ColorGroup.
 * PDF §10 categorization rules.
 */
export function classifyGroup(name: string): ColorGroup {
  const n = name.toLowerCase();

  // chart-1..chart-N
  if (/chart/.test(n)) return "chart";

  // Brand — primary, secondary
  if (/\b(primary|secondary)\b/.test(n)) return "brand";

  // Accent
  if (/\baccent\b/.test(n)) return "accent";

  // Semantic — destructive, warning, success, error, info
  if (/\b(destructive|warning|success|error|info)\b/.test(n)) return "semantic";

  // Interactive — ring, focus, hover
  if (/\b(ring|focus|hover)\b/.test(n)) return "interactive";

  // Surface — card, popover, dialog, sheet
  if (/\b(card|popover|dialog|sheet)\b/.test(n)) return "surface";

  // Neutral — background, foreground, muted, border, input, sidebar
  if (
    /\b(background|foreground|muted|border|input|sidebar)\b/.test(n)
  )
    return "neutral";

  // Neutral fallbacks — color, bg (generic)
  if (/\b(color|bg|text)\b/.test(n)) return "neutral";

  return "custom";
}

// ─── Re-export parseSafe for internal use ────────────────────────────────────
export { parseSafe };

// ─── formatHsl from culori re-export for raw use ─────────────────────────────
export { formatHsl };
