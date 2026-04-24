/**
 * build-profile.ts — Orchestrator that merges all extraction sources into
 * a fully populated BrandProfile.
 */

import type { BrandProfile, BrandColor, BrandFont } from "@/lib/brand/types";

import { buildColorToken, cssVarsToColors } from "./brand-colors";
import { isCssColor, dedupeByName } from "./extract-helpers";
import { buildSpacing } from "./spacing";
import { buildShadows } from "./shadows";
import { buildRadii } from "./radii";
import {
  buildBorders,
  buildBordersFromTailwindTheme,
  mergeBorders,
} from "./borders";
import { buildOpacity } from "./opacity";
import { buildZIndex } from "./zindex";
import { parseGradient, extractGradientsFromCss } from "./gradients";
import { buildAnimations } from "./animations";
import { buildTypography, buildBreakpoints } from "./typography-extract";

import {
  parseTailwindConfig,
  TAILWIND_DEFAULTS,
} from "./tailwind-config";

import { parseCssVars, type CssVarsResult } from "./css-vars";
import { parseShadcnConfig } from "./shadcn-config";
import { detectFonts, type FontFileInput } from "./fonts";
import { scanAssets, type AssetFile } from "./assets";
import { EXTRACTOR_VERSION } from "./extractor-version";
import { pickProjectTintColor } from "@/lib/brand/product-tint";

export interface BuildProfileInput {
  repo: { owner: string; name: string; url?: string };
  tailwindConfigSource?: string;
  tailwindConfigPath?: string;
  cssSources: Array<{ path: string; content: string }>;
  shadcnJson?: string;
  shadcnConfigPath?: string;
  assetFiles?: AssetFile[];
  layoutFiles?: FontFileInput[];
  sha: string;
  branch: string;
  filesScanned?: number;
}

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

  let twTheme = TAILWIND_DEFAULTS;
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

  const colors: BrandColor[] = [];

  for (const res of allCssResults) {
    const tokensFromCss = cssVarsToColors(res, res.path);
    colors.push(...tokensFromCss);
  }

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

  const cssBorders = buildBorders(mergedLight, primaryCssPath || twSource);
  const twBorderExt = buildBordersFromTailwindTheme(
    isCustomTailwind ? twTheme.borderWidth : TAILWIND_DEFAULTS.borderWidth,
    isCustomTailwind ? twTheme.borderColor : TAILWIND_DEFAULTS.borderColor,
    isCustomTailwind ? twTheme.borderStyle : TAILWIND_DEFAULTS.borderStyle,
    isCustomTailwind,
    isCustomTailwind ? twSource : "tailwind-default",
    mergedVarMap
  );
  const borders = mergeBorders(cssBorders, twBorderExt);

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

  const fromTw: BrandProfile["gradients"] = [];
  for (const [name, value] of Object.entries(twTheme.backgroundImage)) {
    try {
      const g = parseGradient(name, value, twSource);
      if (g) fromTw.push(g);
    } catch {
      // skip
    }
  }
  const fromCssFiles = extractGradientsFromCss(cssSources);
  const gradients = dedupeByName([...fromTw, ...fromCssFiles]);

  const typography = buildTypography(
    twTheme.fontSize,
    twTheme.fontFamily,
    twTheme.fontWeight,
    twTheme.lineHeight,
    twSource
  );

  const allFontFiles: FontFileInput[] = [
    ...layoutFiles,
    ...cssSources,
  ];
  const fonts: BrandFont[] = detectFonts(allFontFiles);

  let assets: BrandProfile["assets"] = [];
  if (assetFiles.length > 0) {
    try {
      assets = await scanAssets(assetFiles);
    } catch {
      assets = [];
    }
  }

  let tailwindVersion: "3" | "4" | null = null;
  if (mergedTheme && Object.keys(mergedTheme).length > 0) {
    tailwindVersion = "4";
  } else if (resolvedTailwindPath) {
    tailwindVersion = "3";
  }

  // Cached server-side tint so SSR matches CSR (no first-paint flash).
  const tintHex =
    pickProjectTintColor({ colors: dedupeColors } as unknown as BrandProfile) ?? undefined;

  // Pick a primary logo asset path. Prefer a logo / wordmark / brand asset by
  // name, then a Next.js icon / favicon convention, then any logo-categorized
  // asset.
  const LOGO_RE = /(?:^|\/)(public|assets|src\/assets|app)\/.*?(logo|wordmark|brand)[^/]*\.(svg|png|webp)$/i;
  const ICON_RE = /(?:^|\/)app\/(icon|apple-icon|favicon|opengraph-image|twitter-image)[^/]*\.(svg|png|ico)$/i;
  const FAVICON_RE = /(?:^|\/)favicon\.(ico|png|svg)$/i;
  const primaryLogoPath: string | undefined =
    assets.find((a) => LOGO_RE.test(a.path))?.path ??
    assets.find((a) => ICON_RE.test(a.path))?.path ??
    assets.find((a) => FAVICON_RE.test(a.path))?.path ??
    assets.find((a) => a.category === "logo")?.path ??
    undefined;

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
      extractorVersion: EXTRACTOR_VERSION,
      tintHex,
      primaryLogoPath,
    },
  };
}
