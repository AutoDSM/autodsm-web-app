/**
 * BrandProfile — authoritative shape of the data generated on scan.
 * PDF §9. Stored in repos.brand_profile JSONB in Supabase.
 * Every page in the dashboard + public brand book is a render of this object.
 */

export type ColorGroup =
  | "brand"
  | "accent"
  | "semantic"
  | "neutral"
  | "surface"
  | "interactive"
  | "chart"
  | "custom";

export interface BrandColor {
  name: string; // "primary" | "destructive" | "muted-foreground"
  cssVariable: string; // "--primary"
  value: string; // "#6366F1"
  hsl: string; // "262.1 83.3% 57.8%"
  rgb: string; // "rgb(99, 102, 241)"
  oklch?: string;
  group: ColorGroup;
  /** File path / provenance; `"autodsm-generated"` for merged ramp rows. */
  source: string; // "globals.css:12"
  /** When set, row was merged from AutoDSM suggestions (not extracted). */
  fillOrigin?: "autodsm-generated";
  darkModeValue?: string;
  darkModeHex?: string;
  contrastOnWhite: number;
  contrastOnBlack: number;
  wcagAANormal: boolean; // ≥ 4.5:1 against white OR black
  wcagAALarge: boolean; // ≥ 3:1
  wcagAAA: boolean; // ≥ 7:1
}

export interface BrandTypography {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontSizePx: number;
  fontWeight: string;
  fontWeightNumeric: number;
  lineHeight: string;
  lineHeightPx?: number;
  letterSpacing?: string;
  textTransform?: string;
  source: string;
  category: "heading" | "body" | "utility" | "display";
  tailwindClass?: string;
  /** When set, row came from the deterministic typography guide merge. */
  guideOrigin?: "autodsm-guide";
}

export interface BrandFont {
  family: string;
  importMethod:
    | "next/font/google"
    | "next/font/local"
    | "geist"
    | "@import"
    | "@font-face"
    | "css-variable"
    | "unknown";
  source: string;
  weights: { value: string; name: string }[];
  styles: string[];
  variable?: string;
  fallbacks: string[];
  subsets?: string[];
  displayStrategy?: string;
  role: "primary" | "secondary" | "code" | "display";
}

export interface BrandSpacing {
  name: string;
  /** Common Tailwind utilities that map to this spacing step (e.g. p-4, m-4, gap-4). */
  tailwindClasses: string[];
  rem: string;
  px: number;
  source: string;
  isCustom: boolean;
}

export interface ShadowLayer {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
  colorHex: string;
  /** When `color` is a `var(--token)` */
  colorVarRef?: string;
  inset: boolean;
}

export interface BrandShadow {
  name: string;
  tailwindClass: string;
  value: string;
  layers: ShadowLayer[];
  /** `var(--…)` used in this shadow, deduped. */
  tokenRefs?: string[];
  source: string;
  isCustom: boolean;
}

export interface BrandRadius {
  name: string;
  tailwindClass: string;
  value: string;
  px: number;
  cssVariable?: string;
  source: string;
  isCustom: boolean;
}

export interface BrandBorder {
  name: string;
  width: string;
  style: string;
  color: string;
  colorToken?: string;
  source: string;
  /** Where the token was derived from for grouped UI. */
  borderGroup?: "source" | "width" | "color" | "style";
}

export interface BrandAnimation {
  name: string;
  type: "keyframes" | "transition";
  tailwindClass?: string;
  duration: string;
  timingFunction: string;
  delay?: string;
  keyframes?: string;
  source: string;
  isCustom: boolean;
}

export interface BrandBreakpoint {
  name: string;
  value: string;
  px: number;
  source: string;
  isCustom: boolean;
}

export interface BrandOpacity {
  name: string;
  value: number;
  percentage: string;
  source: string;
  isCustom: boolean;
}

export interface BrandZIndex {
  name: string;
  value: number;
  tailwindClass: string;
  source: string;
  isCustom: boolean;
  inferredRole?: string;
}

export interface BrandGradient {
  name: string;
  type: "linear" | "radial" | "conic";
  cssValue: string;
  stops: {
    color: string;
    colorHex: string;
    position?: string;
    tokenRef?: string;
  }[];
  direction?: string;
  source: string;
}

export interface BrandAsset {
  name: string;
  path: string;
  type: "svg" | "png" | "jpg" | "webp" | "ico" | "gif";
  category: "logo" | "icon" | "image" | "favicon" | "illustration";
  dimensions?: { width: number; height: number };
  fileSize: number;
  fileSizeFormatted: string;
  content?: string;
  dominantColors?: string[];
  hasTransparency?: boolean;
  storageUrl?: string;
  provenance?: "repo" | "user";
}

export interface BrandProfileMeta {
  filesScanned: number;
  cssSource: string;
  tailwindConfigPath: string | null;
  shadcnConfigPath: string | null;
  tailwindVersion: "3" | "4" | null;
  /** User-facing label captured during onboarding (shown in the sidebar). */
  projectName?: string;
  /** Increments when extractor output changes; used for re-scan prompts. */
  extractorVersion?: number;
  /** Wall-clock time of the last successful scan (ms), when recorded. */
  lastScanDurationMs?: number;
  /** Selected project root inside the repo (e.g. "apps/web"); empty for repo root. */
  projectRoot?: string;
  /** Cached primary tint color (hex) chosen at scan time so SSR matches CSR. */
  tintHex?: string;
  /** Repo-relative path of the picked brand logo. */
  primaryLogoPath?: string;
  /** Non-fatal Storage condition surfaced to the dashboard banner. */
  assetsStorageWarning?: "bucket-missing" | "bucket-private" | "upload-failed";
  /** User choices from onboarding / dashboard token review (JSONB-only). */
  tokenChoices?: TokenChoices;
  /** Accepted deterministic typography guide rows (merged suggestions). */
  typographyGuide?: import("./typography-guide").TypographyGuideEntry[];
  /** ISO timestamp of last token review session. */
  lastReviewedAt?: string;
}

/** Persisted under brand_profile.meta.tokenChoices */
export interface TokenChoices {
  acceptedSuggestions: string[];
  dismissed: string[];
  reviewedAt: string;
}

export interface BrandProfile {
  repo: { owner: string; name: string; branch: string; url: string };
  scannedAt: string;
  scannedFromSha: string;
  colors: BrandColor[];
  typography: BrandTypography[];
  fonts: BrandFont[];
  spacing: BrandSpacing[];
  shadows: BrandShadow[];
  radii: BrandRadius[];
  borders: BrandBorder[];
  animations: BrandAnimation[];
  breakpoints: BrandBreakpoint[];
  opacity: BrandOpacity[];
  zIndex: BrandZIndex[];
  gradients: BrandGradient[];
  assets: BrandAsset[];
  meta: BrandProfileMeta;
}

/** Ordered category keys as shown in the sidebar. */
export const BRAND_CATEGORIES = [
  "colors",
  "typography",
  "assets",
  "spacing",
  "shadows",
  "radii",
  "borders",
  "animations",
  "gradients",
  "opacity",
  "zindex",
  "breakpoints",
] as const;
export type BrandCategory = (typeof BRAND_CATEGORIES)[number];

/** Sidebar section groupings (PDF §7). */
export const SIDEBAR_SECTIONS = [
  {
    label: "DESIGN TOKENS",
    items: [
      "colors",
      "typography",
      "assets",
      "spacing",
      "shadows",
      "radii",
      "borders",
      "animations",
      "gradients",
      "opacity",
      "zindex",
    ] as const,
  },
  {
    label: "STRUCTURE",
    items: ["breakpoints"] as const,
  },
] as const;

/** Human labels per route. */
export const CATEGORY_LABELS: Record<string, string> = {
  colors: "Colors",
  typography: "Typography",
  assets: "Assets",
  spacing: "Spacing",
  shadows: "Shadows",
  radii: "Radii",
  borders: "Borders",
  animations: "Animations",
  gradients: "Gradients",
  opacity: "Opacity",
  zindex: "Z-Index",
  breakpoints: "Breakpoints",
};

/** Count tokens for a category on a BrandProfile. */
export function countCategory(
  profile: BrandProfile | null | undefined,
  category: BrandCategory,
): number {
  if (!profile) return 0;
  const key =
    category === "zindex" ? "zIndex" : (category as keyof BrandProfile);
  const arr = profile[key as keyof BrandProfile];
  return Array.isArray(arr) ? arr.length : 0;
}
