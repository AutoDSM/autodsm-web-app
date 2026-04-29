import "server-only";
import type { BrandColor, BrandProfile, BrandTypography } from "./types";
import type { ColorScale } from "./color-scale";
import type { TypographyGuideEntry } from "./typography-guide";
import { buildSuggestions } from "./token-suggestions";
import { contrastRatio, toHsl, toOklchString, toRgbString } from "@/lib/extract/color-utils";

const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export function mergeColorScale(
  profile: BrandProfile,
  scale: ColorScale,
  prefix: "primary" | "secondary",
): BrandColor[] {
  const existing = new Set(profile.colors.map((c) => c.cssVariable));
  const added: BrandColor[] = [];
  for (const step of SCALE_STEPS) {
    const cssVariable = `--brand-${prefix}-${step}`;
    if (existing.has(cssVariable)) continue;
    const hex = scale[step];
    const cw = contrastRatio(hex, "#ffffff");
    const cb = contrastRatio(hex, "#000000");
    added.push({
      name: `brand-${prefix}-${step}`,
      cssVariable,
      value: hex,
      hsl: toHsl(hex),
      rgb: toRgbString(hex),
      oklch: toOklchString(hex),
      group: "brand",
      source: "autodsm-generated",
      fillOrigin: "autodsm-generated",
      contrastOnWhite: cw,
      contrastOnBlack: cb,
      wcagAANormal: cw >= 4.5 || cb >= 4.5,
      wcagAALarge: cw >= 3 || cb >= 3,
      wcagAAA: cw >= 7 || cb >= 7,
    });
  }
  return added;
}

export function typographyRowsFromGuide(
  guide: TypographyGuideEntry[],
): BrandTypography[] {
  return guide.map((row) => ({
    name: `guide-${row.role}`,
    fontFamily: row.fontFamily,
    fontSize: `${row.fontSizePx}px`,
    fontSizePx: row.fontSizePx,
    fontWeight: String(row.fontWeight),
    fontWeightNumeric: row.fontWeight,
    lineHeight: String(
      Math.round((row.lineHeightPx / Math.max(row.fontSizePx, 1)) * 1000) / 1000,
    ),
    lineHeightPx: row.lineHeightPx,
    letterSpacing: row.letterSpacing,
    source: "autodsm-guide",
    category: ["h1", "h2", "h3", "h4", "h5", "h6"].includes(row.role)
      ? "heading"
      : row.role === "caption"
        ? "utility"
        : "body",
    tailwindClass: row.tailwindClass,
    guideOrigin: "autodsm-guide",
  }));
}

function hasRamp(profile: BrandProfile, prefix: "primary" | "secondary"): boolean {
  return profile.colors.some((c) => c.cssVariable === `--brand-${prefix}-600`);
}

function hasGuideRows(profile: BrandProfile): boolean {
  return profile.typography.some((t) => t.guideOrigin === "autodsm-guide");
}

function hasExplicitSecondaryTint(profile: BrandProfile): boolean {
  return profile.colors.some(
    (c) =>
      /secondary/i.test(c.name) ||
      c.cssVariable === "--secondary" ||
      c.cssVariable === "--color-secondary" ||
      c.group === "accent",
  );
}

function pickLogoAssetPath(profile: BrandProfile): string | null {
  const logo = profile.assets.find((a) => a.category === "logo" && a.path);
  return logo?.path ?? null;
}

/**
 * Auto-apply deterministic AutoDSM suggestions in-place so the persisted
 * brand_profile is "rendered" across every category. Idempotent: re-running
 * after a refresh scan won't duplicate ramp tokens or guide rows.
 */
export function finalizeBrandProfile(input: BrandProfile): BrandProfile {
  const profile: BrandProfile = structuredClone(input);
  const suggestions = buildSuggestions(profile);
  const accepted: string[] = [];

  // Primary color ramp.
  if (!hasRamp(profile, "primary")) {
    const s = suggestions.find((x) => x.id === "colors:scale-from-primary");
    if (s && "preview" in s) {
      const added = mergeColorScale(profile, s.preview, "primary");
      if (added.length > 0) {
        profile.colors = [...profile.colors, ...added];
        accepted.push("colors:scale-from-primary");
      }
    }
  }

  // Secondary color ramp (only when there's an explicit secondary/accent tint).
  if (!hasRamp(profile, "secondary") && hasExplicitSecondaryTint(profile)) {
    const s = suggestions.find((x) => x.id === "colors:scale-from-secondary");
    if (s && "preview" in s) {
      const added = mergeColorScale(profile, s.preview, "secondary");
      if (added.length > 0) {
        profile.colors = [...profile.colors, ...added];
        accepted.push("colors:scale-from-secondary");
      }
    }
  }

  // Typography guide rows (h1–caption).
  if (!hasGuideRows(profile)) {
    const s = suggestions.find((x) => x.id === "typography:guide-from-base");
    if (s && "preview" in s) {
      const guide = s.preview;
      const rows = typographyRowsFromGuide(guide);
      if (rows.length > 0) {
        profile.typography = [...profile.typography, ...rows];
        profile.meta = { ...profile.meta, typographyGuide: guide };
        accepted.push("typography:guide-from-base");
      }
    }
  }

  // Auto-promote a primary logo path if one was scanned but never selected.
  if (!profile.meta.primaryLogoPath?.trim()) {
    const logoPath = pickLogoAssetPath(profile);
    if (logoPath) {
      profile.meta = { ...profile.meta, primaryLogoPath: logoPath };
    }
  }

  if (accepted.length > 0) {
    const reviewedAt = new Date().toISOString();
    const prevAccepted = profile.meta.tokenChoices?.acceptedSuggestions ?? [];
    const merged = Array.from(new Set([...prevAccepted, ...accepted]));
    profile.meta = {
      ...profile.meta,
      lastReviewedAt: profile.meta.lastReviewedAt ?? reviewedAt,
      tokenChoices: {
        acceptedSuggestions: merged,
        dismissed: profile.meta.tokenChoices?.dismissed ?? [],
        reviewedAt: profile.meta.tokenChoices?.reviewedAt ?? reviewedAt,
      },
    };
  }

  return profile;
}
