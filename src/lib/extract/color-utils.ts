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

// ─── Shadcn-style "H S% L%" unquoted string (with optional / alpha) ───────────
const SHADCN_PATTERN =
  /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%(?:\s*\/\s*([\d.]+))?$/;

// hsl(var(--token) / 0.5)  rgb(var(--rgb)) oklch(var(--ok)) etc.
const CHANNEL_VAR_PATTERN =
  /^(hsl|hsla|rgb|rgba|oklch|oklab)\(\s*var\(([^,)]+)(?:,([^)]+))?\)\s*(?:\/\s*([^)]+)\s*)?\)$/i;

/**
 * Normalise any CSS color string (including shadcn "H S% L%" bare format,
 * var(--foo) references, var(--foo, fallback) fallback chains, and Tailwind
 * v4 alpha-channel shorthand like `hsl(var(--primary) / 0.5)`) into a culori
 * Color object, or null.
 */
function parseSafe(
  value: string,
  varMap?: Record<string, string>,
  depth = 0,
): Color | null {
  if (!value || depth > 4) return null;
  const trimmed = value.trim();

  // hsl(var(--x) / 0.5) etc. — resolve the inner var, then re-wrap.
  const channelVar = trimmed.match(CHANNEL_VAR_PATTERN);
  if (channelVar) {
    const fn = channelVar[1].toLowerCase();
    const innerName = channelVar[2].trim();
    const innerFallback = channelVar[3]?.trim();
    const alpha = channelVar[4]?.trim();
    let inner: string | undefined = varMap?.[innerName] ?? innerFallback;
    if (!inner) return null;
    inner = inner.trim();
    // If the inner is itself bare H S% L%, leave the channels as-is so we can
    // wrap with `hsl(...)`. Otherwise resolve recursively into a hex.
    let inside = inner;
    if (!new RegExp(`^${fn}|^[0-9.\\s%]`).test(inner)) {
      const resolved = parseSafe(inner, varMap, depth + 1);
      if (resolved) {
        const hex = formatHex(resolved);
        if (hex) inside = hex;
      }
    }
    const wrapped = alpha != null ? `${fn}(${inside} / ${alpha})` : `${fn}(${inside})`;
    try {
      return parse(wrapped) ?? null;
    } catch {
      return null;
    }
  }

  // var(--foo) or var(--foo, fallback)
  if (trimmed.startsWith("var(")) {
    const match = trimmed.match(/^var\(([^,)]+)(?:,([^)]+))?\)/);
    if (!match) return null;
    const varName = match[1].trim();
    const fallback = match[2]?.trim();
    const resolved = varMap?.[varName] ?? fallback;
    if (!resolved) return null;
    return parseSafe(resolved, varMap, depth + 1);
  }

  // Shadcn bare "H S% L%" or "H S% L% / A"
  const shadcn = trimmed.match(SHADCN_PATTERN);
  if (shadcn) {
    const [, h, s, l, a] = shadcn;
    const wrapped = a != null
      ? `hsla(${h}, ${s}%, ${l}%, ${a})`
      : `hsl(${h} ${s}% ${l}%)`;
    try {
      return parse(wrapped) ?? null;
    } catch {
      return null;
    }
  }

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
 * Convert any parsable color to "oklch(L C H)" string. Returns undefined
 * only when the input cannot be parsed as a color at all.
 */
export function toOklchString(
  value: string,
  varMap?: Record<string, string>
): string | undefined {
  const color = parseSafe(value, varMap);
  if (!color) return undefined;
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
