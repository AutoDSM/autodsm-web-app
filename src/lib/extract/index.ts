/**
 * src/lib/extract/index.ts — Public API for the AutoDSM extraction engine.
 *
 * Import from here rather than individual files:
 *   import { buildBrandProfile, parseTailwindConfig, parseCssVars, ... } from "@/lib/extract"
 */

// ── Orchestrator ──────────────────────────────────────────────────────────────
export { buildBrandProfile } from "./build-profile";
export type { BuildProfileInput } from "./build-profile";
export { EXTRACTOR_VERSION } from "./extractor-version";
export { buildSpacing } from "./spacing";
export { buildShadows, parseShadowLayers } from "./shadows";
export { buildRadii } from "./radii";
export { buildBorders } from "./borders";
export { buildOpacity } from "./opacity";
export { buildZIndex, inferZIndexRole } from "./zindex";
export { parseGradient, extractGradientsFromCss } from "./gradients";
export { buildAnimations } from "./animations";
export { buildTypography, buildBreakpoints } from "./typography-extract";
export { dedupeByName, isCssColor, remToPx, pxToRem } from "./extract-helpers";

// ── Color utilities ───────────────────────────────────────────────────────────
export {
  toHex,
  toHsl,
  toRgbString,
  toOklchString,
  contrastRatio,
  classifyGroup,
} from "./color-utils";

// ── Tailwind config parser ─────────────────────────────────────────────────────
export {
  parseTailwindConfig,
  TAILWIND_DEFAULTS,
} from "./tailwind-config";
export type { ParsedTailwindTheme, ThemeValueMap } from "./tailwind-config";

// ── CSS variable parser ────────────────────────────────────────────────────────
export { parseCssVars } from "./css-vars";
export type { CssVarsResult } from "./css-vars";

// ── shadcn config resolver ─────────────────────────────────────────────────────
export { parseShadcnConfig } from "./shadcn-config";
export type { ShadcnConfigResult } from "./shadcn-config";

// ── Font detection ────────────────────────────────────────────────────────────
export { detectFonts } from "./fonts";
export type { FontFileInput } from "./fonts";

// ── Asset scanner ─────────────────────────────────────────────────────────────
export { scanAssets } from "./assets";
export type { AssetFile } from "./assets";
