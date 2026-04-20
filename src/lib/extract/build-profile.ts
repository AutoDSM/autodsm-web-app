/**
 * build-profile.ts — Orchestrator that merges all extraction sources into
 * a fully populated BrandProfile.
 * PDF §9 (BrandProfile interface) + §10 (Extraction Engine).
 */

import type {
  BrandProfile,
  BrandColor,
  BrandTypography,
  BrandFont,
  BrandSpacing,
  BrandShadow,
  ShadowLayer,
  BrandRadius,
  BrandBorder,
  BrandAnimation,
  BrandBreakpoint,
  BrandOpacity,
  BrandZIndex,
  BrandGradient,
  BrandAsset,
  ColorGroup,
} from "@/lib/brand/types";

import {
  toHex,
  toHsl,
  toRgbString,
  toOklchString,
  contrastRatio,
  classifyGroup,
} from "./color-utils";

import {
  parseTailwindConfig,
  TAILWIND_DEFAULTS,
  type ParsedTailwindTheme,
  type ThemeValueMap,
} from "./tailwind-config";

import { parseCssVars, type CssVarsResult } from "./css-vars";
import { parseShadcnConfig } from "./shadcn-config";
import { detectFonts, type FontFileInput } from "./fonts";
import { scanAssets, type AssetFile } from "./assets";

// ─── Input type ───────────────────────────────────────────────────────────────

export interface BuildProfileInput {
  repo: { owner: string; name: string; url?: string };
  /** Tailwind config source text (optional) */
  tailwindConfigSource?: string;
  /** Path of the tailwind config file */
  tailwindConfigPath?: string;
  /** CSS sources to parse */
  cssSources: Array<{ path: string; content: string }>;
  /** Raw components.json string (optional) */
  shadcnJson?: string;
  /** Shadcn config file path */
  shadcnConfigPath?: string;
  /** Asset files for scanning */
  assetFiles?: AssetFile[];
  /** Layout / app files for font detection */
  layoutFiles?: FontFileInput[];
  /** SHA of the scanned commit */
  sha: string;
  /** Branch name */
  branch: string;
  /** Total number of files scanned (for meta) */
  filesScanned?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCssColor(value: string): boolean {
  if (!value) return false;
  const v = value.trim();
  if (
    v.startsWith("#") ||
    v.startsWith("rgb") ||
    v.startsWith("hsl") ||
    v.startsWith("oklch") ||
    v.startsWith("color(") ||
    /^[a-zA-Z]+$/.test(v) // named color
  )
    return true;
  // shadcn bare HSL
  if (/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/.test(v))
    return true;
  return false;
}

function remToPx(rem: string): number {
  const match = rem.match(/^([\d.]+)rem$/);
  if (match) return Math.round(parseFloat(match[1]) * 16);
  const px = rem.match(/^([\d.]+)px$/);
  if (px) return Math.round(parseFloat(px[1]));
  const plain = parseFloat(rem);
  if (!isNaN(plain)) return Math.round(plain * 16);
  return 0;
}

function pxToRem(px: number): string {
  return `${(px / 16).toFixed(4).replace(/\.?0+$/, "")}rem`;
}

function inferZIndexRole(value: number): string | undefined {
  if (value >= 9000) return "Toast / notifications";
  if (value >= 1000) return "Modal overlays";
  if (value >= 500) return "Dropdown menus";
  if (value >= 100) return "Fixed headers";
  if (value >= 10) return "Elevated UI";
  return undefined;
}

// ─── Shadow layer parser ──────────────────────────────────────────────────────

function parseShadowLayers(value: string): ShadowLayer[] {
  const layers: ShadowLayer[] = [];
  if (!value || value === "none") return layers;

  // Split on comma that is NOT inside parentheses
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    const tokens = part.trim().split(/\s+/);
    const inset = tokens[0] === "inset";
    const rest = inset ? tokens.slice(1) : tokens;

    // Find color token (first non-dimension token or last token)
    // Dimensions are like "0", "0px", "-1px", etc.
    const dimRe = /^-?[\d.]+(?:px|rem|em|%)?$/;
    const dims: string[] = [];
    let colorToken = "";
    for (const tok of rest) {
      if (dimRe.test(tok) && dims.length < 4) {
        dims.push(tok);
      } else {
        colorToken = tok;
      }
    }
    // If color is rgba/rgb/hsl etc., it may have been split — rejoin
    if (colorToken.startsWith("rgb") || colorToken.startsWith("hsl")) {
      // already whole since we split on commas inside parens
    }
    const hex = toHex(colorToken) ?? colorToken;
    layers.push({
      offsetX: dims[0] ?? "0",
      offsetY: dims[1] ?? "0",
      blur: dims[2] ?? "0",
      spread: dims[3] ?? "0",
      color: colorToken,
      colorHex: hex,
      inset,
    });
  }
  return layers;
}

// ─── Gradient parser ──────────────────────────────────────────────────────────

function parseGradient(
  name: string,
  value: string,
  source: string
): BrandGradient | null {
  let type: BrandGradient["type"];
  if (value.startsWith("linear-gradient")) type = "linear";
  else if (value.startsWith("radial-gradient")) type = "radial";
  else if (value.startsWith("conic-gradient")) type = "conic";
  else return null;

  // Extract direction (first token before first color stop)
  const inner = value.replace(/^[a-z-]+gradient\(/, "").replace(/\)$/, "");
  const dirMatch = inner.match(/^(to\s+\w+(?:\s+\w+)?|[\d.]+deg|[\d.]+turn)/);
  const direction = dirMatch ? dirMatch[0] : undefined;

  // Parse stops
  const stops: BrandGradient["stops"] = [];
  // Very naive: find all color-like tokens
  const stopRe =
    /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|var\(--[\w-]+\)|[a-z]+)\s*([\d.]+%)?/g;
  let sm: RegExpExecArray | null;
  while ((sm = stopRe.exec(inner)) !== null) {
    const color = sm[1];
    if (["to", "from", "at", "in", "deg", "turn"].includes(color)) continue;
    const hex = toHex(color) ?? "";
    stops.push({
      color,
      colorHex: hex,
      position: sm[2],
      tokenRef: color.startsWith("var(") ? color : undefined,
    });
  }

  if (stops.length < 2) return null;

  return { name, type, cssValue: value, stops, direction, source };
}

// ─── Color token builder ──────────────────────────────────────────────────────

function buildColorToken(
  name: string,
  cssVariable: string,
  value: string,
  source: string,
  darkValue: string | undefined,
  varMap: Record<string, string>
): BrandColor | null {
  const hex = toHex(value, varMap);
  if (!hex) return null;

  const hsl = toHsl(value, varMap);
  const rgb = toRgbString(value, varMap);
  const oklch = toOklchString(value, varMap);

  const cw = contrastRatio(hex, "#ffffff");
  const cb = contrastRatio(hex, "#000000");

  const darkHex = darkValue ? (toHex(darkValue, varMap) ?? undefined) : undefined;

  const group: ColorGroup = classifyGroup(name);

  return {
    name,
    cssVariable,
    value: hex,
    hsl,
    rgb,
    oklch,
    group,
    source,
    darkModeValue: darkValue,
    darkModeHex: darkHex,
    contrastOnWhite: Math.round(cw * 100) / 100,
    contrastOnBlack: Math.round(cb * 100) / 100,
    wcagAANormal: cw >= 4.5 || cb >= 4.5,
    wcagAALarge: cw >= 3 || cb >= 3,
    wcagAAA: cw >= 7 || cb >= 7,
  };
}

// ─── CSS vars → color tokens ──────────────────────────────────────────────────

function cssVarsToColors(
  cssResult: CssVarsResult,
  source: string
): BrandColor[] {
  const colors: BrandColor[] = [];
  const allVars = { ...cssResult.lightVars, ...cssResult.themeVars };
  const varMap = allVars;

  for (const [varName, value] of Object.entries(allVars)) {
    if (!isCssColor(value)) continue;
    const name = varName.replace(/^--/, "");
    const darkValue = cssResult.darkVars[varName];
    const token = buildColorToken(name, varName, value, source, darkValue, varMap);
    if (token) colors.push(token);
  }
  return colors;
}

// ─── Tailwind theme → BrandSpacing ───────────────────────────────────────────

function buildSpacing(
  spacing: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandSpacing[] {
  const result: BrandSpacing[] = [];
  for (const [name, value] of Object.entries(spacing)) {
    const px = remToPx(value);
    result.push({
      name,
      tailwindClass: `p-${name}`,
      rem: value.includes("rem") ? value : value === "0px" ? "0rem" : pxToRem(px),
      px,
      source,
      isCustom,
    });
  }
  return result.sort((a, b) => a.px - b.px);
}

// ─── Tailwind theme → BrandShadow ────────────────────────────────────────────

function buildShadows(
  shadows: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandShadow[] {
  return Object.entries(shadows).map(([name, value]) => ({
    name,
    tailwindClass: name === "DEFAULT" ? "shadow" : `shadow-${name}`,
    value,
    layers: parseShadowLayers(value),
    source,
    isCustom,
  }));
}

// ─── Tailwind theme → BrandRadius ────────────────────────────────────────────

function buildRadii(
  radii: ThemeValueMap,
  isCustom: boolean,
  source: string,
  cssVarMap?: Record<string, string>
): BrandRadius[] {
  return Object.entries(radii).map(([name, value]) => {
    const px = remToPx(value);
    const cssVariable = value.startsWith("var(")
      ? value.match(/var\((--[\w-]+)\)/)?.[1]
      : undefined;
    const resolvedValue =
      cssVariable && cssVarMap?.[cssVariable]
        ? cssVarMap[cssVariable]
        : value;
    const resolvedPx = remToPx(resolvedValue);
    return {
      name,
      tailwindClass: name === "DEFAULT" ? "rounded" : `rounded-${name}`,
      value: resolvedValue,
      px: resolvedPx || px,
      cssVariable,
      source,
      isCustom,
    };
  });
}

// ─── Tailwind theme → BrandBreakpoint ────────────────────────────────────────

function buildBreakpoints(
  screens: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandBreakpoint[] {
  return Object.entries(screens).map(([name, value]) => {
    const px = parseInt(value) || 0;
    return {
      name,
      value,
      px,
      source,
      isCustom,
    };
  });
}

// ─── Tailwind theme → BrandOpacity ───────────────────────────────────────────

function buildOpacity(
  opacity: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandOpacity[] {
  return Object.entries(opacity).map(([name, value]) => {
    const num = parseFloat(value);
    return {
      name,
      value: isNaN(num) ? 0 : num,
      percentage: isNaN(num) ? "0%" : `${Math.round(num * 100)}%`,
      source,
      isCustom,
    };
  });
}

// ─── Tailwind theme → BrandZIndex ────────────────────────────────────────────

function buildZIndex(
  zIndex: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandZIndex[] {
  return Object.entries(zIndex)
    .filter(([, v]) => v !== "auto")
    .map(([name, value]) => {
      const num = parseInt(value) || 0;
      return {
        name,
        value: num,
        tailwindClass: `z-${name}`,
        source,
        isCustom,
        inferredRole: inferZIndexRole(num),
      };
    });
}

// ─── Tailwind theme → BrandAnimation ─────────────────────────────────────────

function buildAnimations(
  animations: ThemeValueMap,
  keyframesCss: ThemeValueMap,
  cssKeyframes: Array<{ name: string; css: string; source: string }>,
  transitionDuration: ThemeValueMap,
  transitionTiming: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandAnimation[] {
  const result: BrandAnimation[] = [];

  // Keyframes-based animations from tailwind theme
  for (const [name, value] of Object.entries(animations)) {
    // value is like "accordion-down 0.2s ease-out"
    const parts = value.split(/\s+/);
    const duration = parts.find((p) => /^\d+(?:\.\d+)?(?:ms|s)$/.test(p)) ?? "200ms";
    const timing =
      parts.find((p) =>
        ["ease", "ease-in", "ease-out", "ease-in-out", "linear", "step-start", "step-end"].includes(p) ||
        p.startsWith("cubic-bezier")
      ) ?? "ease";
    const kfName = parts[0];
    const kfCss =
      cssKeyframes.find((k) => k.name === kfName)?.css ??
      keyframesCss[kfName] ??
      undefined;

    result.push({
      name,
      type: "keyframes",
      tailwindClass: `animate-${name}`,
      duration,
      timingFunction: timing,
      keyframes: kfCss,
      source,
      isCustom,
    });
  }

  // Keyframes found directly in CSS
  for (const kf of cssKeyframes) {
    if (result.find((a) => a.name === kf.name)) continue;
    result.push({
      name: kf.name,
      type: "keyframes",
      duration: "200ms",
      timingFunction: "ease",
      keyframes: kf.css,
      source: kf.source,
      isCustom: true,
    });
  }

  // Transition utilities
  for (const [name, duration] of Object.entries(transitionDuration)) {
    if (name === "DEFAULT") continue;
    const timing = transitionTiming[name] ?? transitionTiming.DEFAULT ?? "ease";
    result.push({
      name: `transition-${name}`,
      type: "transition",
      duration,
      timingFunction: timing,
      source,
      isCustom: false,
    });
  }

  return result;
}

// ─── Typography from tailwind fontSize ───────────────────────────────────────

function buildTypography(
  fontSize: ThemeValueMap,
  fontFamily: ThemeValueMap,
  fontWeight: ThemeValueMap,
  lineHeight: ThemeValueMap,
  source: string
): BrandTypography[] {
  const primaryFamily =
    fontFamily["sans"] ?? fontFamily["DEFAULT"] ?? "sans-serif";

  const tailwindSizeMap: Record<string, string> = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
    "5xl": "text-5xl",
    "6xl": "text-6xl",
    "7xl": "text-7xl",
    "8xl": "text-8xl",
    "9xl": "text-9xl",
  };

  const categoryMap: Record<
    string,
    BrandTypography["category"]
  > = {
    xs: "utility",
    sm: "utility",
    base: "body",
    lg: "body",
    xl: "body",
    "2xl": "heading",
    "3xl": "heading",
    "4xl": "heading",
    "5xl": "heading",
    "6xl": "display",
    "7xl": "display",
    "8xl": "display",
    "9xl": "display",
  };

  const defaultWeight = fontWeight["normal"] ?? "400";

  return Object.entries(fontSize).map(([name, value]) => {
    // value may be "1rem" or ["1rem", { lineHeight: "1.5" }] as a raw string
    const sizeStr = value.split(",")[0].replace(/[["']/g, "").trim();
    const px = remToPx(sizeStr);
    const lhKey = name in lineHeight ? name : "normal";
    const lhVal = lineHeight[lhKey] ?? "1.5";
    const lhPx = remToPx(lhVal) || Math.round(px * 1.5);

    return {
      name,
      fontFamily: primaryFamily,
      fontSize: sizeStr,
      fontSizePx: px,
      fontWeight: defaultWeight,
      fontWeightNumeric: parseInt(defaultWeight) || 400,
      lineHeight: lhVal,
      lineHeightPx: lhPx || undefined,
      source,
      category: categoryMap[name] ?? "utility",
      tailwindClass: tailwindSizeMap[name],
    };
  });
}

// ─── Build borders from CSS vars ─────────────────────────────────────────────

function buildBorders(
  lightVars: Record<string, string>,
  source: string
): BrandBorder[] {
  const borders: BrandBorder[] = [];
  const varMap = lightVars;

  // Look for --border, --input, --ring etc.
  const borderVarNames = Object.keys(lightVars).filter((v) => {
    const n = v.replace(/^--/, "");
    return /border|input|ring/.test(n);
  });

  for (const varName of borderVarNames) {
    const value = lightVars[varName];
    const name = varName.replace(/^--/, "");
    const hex = toHex(value, varMap) ?? "#e5e7eb";
    borders.push({
      name,
      width: "1px",
      style: "solid",
      color: hex,
      colorToken: varName,
      source,
    });
  }

  // Default border if none found
  if (borders.length === 0) {
    borders.push({
      name: "default",
      width: "1px",
      style: "solid",
      color: "#e5e7eb",
      source,
    });
  }
  return borders;
}

// ─── Dedupe helpers ───────────────────────────────────────────────────────────

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Build a fully populated BrandProfile from all extraction sources.
 * Never throws — missing sources produce empty arrays.
 */
export async function buildBrandProfile(
  input: BuildProfileInput
): Promise<BrandProfile> {
  const {
    repo,
    tailwindConfigSource,
    tailwindConfigPath = "tailwind.config.ts",
    cssSources,
    shadcnJson,
    shadcnConfigPath,
    assetFiles = [],
    layoutFiles = [],
    sha,
    branch,
    filesScanned = 0,
  } = input;

  // ── 1. Parse tailwind config ─────────────────────────────────────────────────
  let twTheme: ParsedTailwindTheme = TAILWIND_DEFAULTS;
  let resolvedTailwindPath: string | null = null;

  if (tailwindConfigSource) {
    try {
      twTheme = parseTailwindConfig(tailwindConfigSource, tailwindConfigPath);
      resolvedTailwindPath = tailwindConfigPath;
    } catch {
      twTheme = TAILWIND_DEFAULTS;
    }
  }

  const isCustomTailwind = resolvedTailwindPath !== null;
  const twSource = resolvedTailwindPath ?? "tailwind-default";

  // ── 2. Parse CSS sources ─────────────────────────────────────────────────────
  let primaryCssPath = "";
  const allCssResults: Array<CssVarsResult & { path: string }> = [];

  for (const { path: cssPath, content } of cssSources) {
    try {
      const res = parseCssVars(content, cssPath);
      allCssResults.push({ ...res, path: cssPath });
      if (!primaryCssPath && Object.keys(res.lightVars).length > 0) {
        primaryCssPath = cssPath;
      }
    } catch {
      // skip
    }
  }

  // ── 3. shadcn config ─────────────────────────────────────────────────────────
  let resolvedShadcnPath: string | null = null;
  let detectedShadcnCssPath: string | null = null;

  if (shadcnJson) {
    try {
      const shadcn = parseShadcnConfig(shadcnJson);
      resolvedShadcnPath = shadcnConfigPath ?? "components.json";
      detectedShadcnCssPath = shadcn.cssPath;
    } catch {
      // skip
    }
  }

  // Merge all CSS vars
  const mergedLight: Record<string, string> = {};
  const mergedDark: Record<string, string> = {};
  const mergedTheme: Record<string, string> = {};
  const allKeyframes: Array<{ name: string; css: string; source: string }> = [];

  for (const res of allCssResults) {
    Object.assign(mergedLight, res.lightVars);
    Object.assign(mergedDark, res.darkVars);
    Object.assign(mergedTheme, res.themeVars);
    allKeyframes.push(...res.keyframes);
  }

  const mergedVarMap = { ...mergedLight, ...mergedTheme };

  // ── 4. Colors ─────────────────────────────────────────────────────────────────
  const colors: BrandColor[] = [];

  // From CSS vars
  for (const res of allCssResults) {
    const tokensFromCss = cssVarsToColors(res, res.path);
    colors.push(...tokensFromCss);
  }

  // From tailwind colors (non-CSS-var)
  for (const [name, value] of Object.entries(twTheme.colors)) {
    if (colors.find((c) => c.name === name)) continue;
    if (!isCssColor(value)) continue;
    const token = buildColorToken(
      name,
      `--${name}`,
      value,
      twSource,
      undefined,
      mergedVarMap
    );
    if (token) colors.push(token);
  }

  const dedupeColors = dedupeByName(colors);

  // ── 5. Spacing ────────────────────────────────────────────────────────────────
  const defaultSpacing = buildSpacing(
    TAILWIND_DEFAULTS.spacing,
    false,
    "tailwind-default"
  );
  const customSpacing =
    isCustomTailwind
      ? buildSpacing(
          twTheme.spacing,
          true,
          twSource
        ).filter(
          (s) => !TAILWIND_DEFAULTS.spacing[s.name]
        )
      : [];

  const spacing = dedupeByName([...defaultSpacing, ...customSpacing]);

  // ── 6. Shadows ────────────────────────────────────────────────────────────────
  const defaultShadows = buildShadows(TAILWIND_DEFAULTS.boxShadow, false, "tailwind-default");
  const customShadows = isCustomTailwind
    ? buildShadows(
        Object.fromEntries(
          Object.entries(twTheme.boxShadow).filter(
            ([k]) => !TAILWIND_DEFAULTS.boxShadow[k]
          )
        ),
        true,
        twSource
      )
    : [];
  const shadows = dedupeByName([...defaultShadows, ...customShadows]);

  // ── 7. Radii ──────────────────────────────────────────────────────────────────
  const defaultRadii = buildRadii(TAILWIND_DEFAULTS.borderRadius, false, "tailwind-default", mergedVarMap);
  const customRadii = isCustomTailwind
    ? buildRadii(
        Object.fromEntries(
          Object.entries(twTheme.borderRadius).filter(
            ([k]) => !TAILWIND_DEFAULTS.borderRadius[k]
          )
        ),
        true,
        twSource,
        mergedVarMap
      )
    : [];
  const radii = dedupeByName([...defaultRadii, ...customRadii]);

  // ── 8. Borders ────────────────────────────────────────────────────────────────
  const borders: BrandBorder[] = buildBorders(mergedLight, primaryCssPath || twSource);

  // ── 9. Animations ─────────────────────────────────────────────────────────────
  const animations = dedupeByName(
    buildAnimations(
      twTheme.animation,
      twTheme.keyframes,
      allKeyframes,
      twTheme.transitionDuration,
      twTheme.transitionTimingFunction,
      isCustomTailwind,
      twSource
    )
  );

  // ── 10. Breakpoints ───────────────────────────────────────────────────────────
  const defaultBreakpoints = buildBreakpoints(TAILWIND_DEFAULTS.screens, false, "tailwind-default");
  const customBreakpoints = isCustomTailwind
    ? buildBreakpoints(
        Object.fromEntries(
          Object.entries(twTheme.screens).filter(
            ([k]) => !TAILWIND_DEFAULTS.screens[k]
          )
        ),
        true,
        twSource
      )
    : [];
  const breakpoints = dedupeByName([...defaultBreakpoints, ...customBreakpoints]);

  // ── 11. Opacity ───────────────────────────────────────────────────────────────
  const defaultOpacity = buildOpacity(TAILWIND_DEFAULTS.opacity, false, "tailwind-default");
  const customOpacity = isCustomTailwind
    ? buildOpacity(
        Object.fromEntries(
          Object.entries(twTheme.opacity).filter(
            ([k]) => !TAILWIND_DEFAULTS.opacity[k]
          )
        ),
        true,
        twSource
      )
    : [];
  const opacity = dedupeByName([...defaultOpacity, ...customOpacity]);

  // ── 12. Z-Index ───────────────────────────────────────────────────────────────
  const defaultZIndex = buildZIndex(TAILWIND_DEFAULTS.zIndex, false, "tailwind-default");
  const customZIndex = isCustomTailwind
    ? buildZIndex(
        Object.fromEntries(
          Object.entries(twTheme.zIndex).filter(
            ([k]) => !TAILWIND_DEFAULTS.zIndex[k]
          )
        ),
        true,
        twSource
      )
    : [];
  const zIndex = dedupeByName([...defaultZIndex, ...customZIndex]);

  // ── 13. Gradients ─────────────────────────────────────────────────────────────
  const gradients: BrandGradient[] = [];
  for (const [name, value] of Object.entries(twTheme.backgroundImage)) {
    try {
      const g = parseGradient(name, value, twSource);
      if (g) gradients.push(g);
    } catch {
      // skip
    }
  }

  // ── 14. Typography ────────────────────────────────────────────────────────────
  const typography: BrandTypography[] = buildTypography(
    twTheme.fontSize,
    twTheme.fontFamily,
    twTheme.fontWeight,
    twTheme.lineHeight,
    twSource
  );

  // ── 15. Fonts ─────────────────────────────────────────────────────────────────
  const allFontFiles: FontFileInput[] = [
    ...layoutFiles,
    ...cssSources,
  ];
  const fonts: BrandFont[] = detectFonts(allFontFiles);

  // ── 16. Assets ────────────────────────────────────────────────────────────────
  let assets: BrandAsset[] = [];
  if (assetFiles.length > 0) {
    try {
      assets = await scanAssets(assetFiles);
    } catch {
      assets = [];
    }
  }

  // ── 17. Detect Tailwind version ───────────────────────────────────────────────
  let tailwindVersion: "3" | "4" | null = null;
  if (mergedTheme && Object.keys(mergedTheme).length > 0) {
    tailwindVersion = "4";
  } else if (resolvedTailwindPath) {
    tailwindVersion = "3";
  }

  // ── Assemble BrandProfile ─────────────────────────────────────────────────────
  return {
    repo: {
      owner: repo.owner,
      name: repo.name,
      branch,
      url: repo.url ?? `https://github.com/${repo.owner}/${repo.name}`,
    },
    scannedAt: new Date().toISOString(),
    scannedFromSha: sha,
    colors: dedupeColors,
    typography,
    fonts,
    spacing,
    shadows,
    radii,
    borders,
    animations,
    breakpoints,
    opacity,
    zIndex,
    gradients,
    assets,
    meta: {
      filesScanned,
      cssSource: primaryCssPath || detectedShadcnCssPath || "",
      tailwindConfigPath: resolvedTailwindPath,
      shadcnConfigPath: resolvedShadcnPath,
      tailwindVersion,
    },
  };
}
