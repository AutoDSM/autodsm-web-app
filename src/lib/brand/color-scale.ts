/**
 * Perceptual 50–900 ramps from a single brand hex using OKLch (culori).
 */

import { converter, formatHex, parse, wcagContrast, type Color } from "culori";

const toOklch = converter("oklch");

export type ScaleStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type ColorScale = Record<ScaleStep, string>;

export interface ColorScaleOptions {
  /** Step that the input hex anchors to (defaults to 600 — Tailwind-style brand slot). */
  anchor?: ScaleStep;
  /** Hue shift across the ramp (degrees). */
  hueShift?: number;
  /** Clamp chroma to avoid noisy extremes in OKLch (typical 0.12–0.28). */
  maxChroma?: number;
}

/** OKLch L per step — tuned to feel like Tailwind-style ramps. */
const STEP_LIGHTNESS: Record<ScaleStep, number> = {
  50: 0.97,
  100: 0.94,
  200: 0.88,
  300: 0.8,
  400: 0.7,
  500: 0.62,
  600: 0.55,
  700: 0.46,
  800: 0.36,
  900: 0.26,
};

const STEPS: ScaleStep[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

function clampChromaLightSteps(step: ScaleStep, c: number): number {
  if (step === 50) return c * 0.35;
  if (step === 100) return c * 0.65;
  return c;
}

/**
 * Builds a 50–900 hex scale; `baseHex` is pinned to `anchor` (default 600).
 */
export function generateColorScale(baseHex: string, opts?: ColorScaleOptions): ColorScale {
  const anchor = opts?.anchor ?? 600;
  const hueShift = opts?.hueShift ?? 0;
  const maxChroma = opts?.maxChroma ?? 0.22;

  const parsed = parse(baseHex.trim());
  if (!parsed) throw new Error(`Invalid color: ${baseHex}`);
  const ok = toOklch(parsed);
  if (!ok || ok.l == null || ok.c == null || ok.h == null) {
    throw new Error(`Could not parse OKLch from: ${baseHex}`);
  }

  const anchorIdx = STEPS.indexOf(anchor);
  const baseHue = ok.h;

  const out = {} as ColorScale;
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    const L = STEP_LIGHTNESS[step];
    let c = Math.min(ok.c, maxChroma);
    c = clampChromaLightSteps(step, c);
    const span = (i - anchorIdx) / Math.max(STEPS.length - 1, 1);
    const h = baseHue + hueShift * span;
    const col = formatHex({ mode: "oklch", l: L, c, h });
    if (!col) throw new Error(`Could not format hex for step ${step}`);
    out[step] = col;
  }

  const pinned = formatHex(parsed);
  if (!pinned) throw new Error("Could not pin anchor hex");
  out[anchor] = pinned;

  return out;
}

/** Minimum WCAG contrast vs white for steps 700–900 (for tests). */
export function minContrastVsWhite700to900(scale: ColorScale): number {
  let min = 21;
  for (const s of [700, 800, 900] as const) {
    const c = wcagContrast(scale[s], "#ffffff");
    if (c < min) min = c;
  }
  return min;
}
