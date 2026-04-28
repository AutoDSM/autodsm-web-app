import {
  BRAND_CATEGORIES,
  CATEGORY_LABELS,
  type BrandCategory,
  type BrandProfile,
  countCategory,
} from "./types";
import { pickProjectTintColor } from "./product-tint";

export type CoverageStatus = "rendered" | "partial" | "missing";

export type SuggestionId =
  | "colors:scale-from-primary"
  | "colors:scale-from-secondary"
  | "typography:guide-from-base"
  | "assets:upload-logo";

export type CoverageRow = {
  category: BrandCategory;
  label: string;
  count: number;
  status: CoverageStatus;
  notes?: string[];
  suggestions: SuggestionId[];
};

function hasHeadingCoverage(profile: BrandProfile): boolean {
  const headings = profile.typography.filter((t) => t.category === "heading");
  if (headings.length === 0) return false;
  const maxPx = Math.max(...headings.map((h) => h.fontSizePx));
  return maxPx >= 22;
}

function hasPrimaryFont(profile: BrandProfile): boolean {
  return profile.fonts.some((f) => f.role === "primary");
}

function hasLogoAsset(profile: BrandProfile): boolean {
  const logos = profile.assets.filter((a) => a.category === "logo");
  if (logos.length === 0) return false;
  if (!profile.meta.primaryLogoPath?.trim()) return false;
  return true;
}

/**
 * Compare extracted BrandProfile coverage vs expected categories & heuristics.
 */
export function analyzeBrandProfileCoverage(profile: BrandProfile): CoverageRow[] {
  const rows: CoverageRow[] = [];

  for (const category of BRAND_CATEGORIES) {
    const count = countCategory(profile, category);
    const label = CATEGORY_LABELS[category] ?? category;
    const notes: string[] = [];
    const suggestions: SuggestionId[] = [];

    if (category === "colors") {
      const tint = pickProjectTintColor(profile);
      const partial =
        count < 5 ||
        !tint ||
        !profile.colors.some(
          (c) =>
            c.name === "primary" ||
            c.cssVariable === "--primary" ||
            /(^|-)primary$/i.test(c.name),
        );
      if (partial) {
        suggestions.push("colors:scale-from-primary");
        suggestions.push("colors:scale-from-secondary");
        if (count < 5) notes.push("Fewer than 5 palette colors detected.");
        if (!tint) notes.push("Could not resolve a primary brand tint.");
      }
      rows.push({
        category,
        label,
        count,
        status: partial ? "partial" : "rendered",
        notes: notes.length ? notes : undefined,
        suggestions: [...new Set(suggestions)],
      });
      continue;
    }

    if (category === "typography") {
      const partial =
        !hasHeadingCoverage(profile) ||
        !hasPrimaryFont(profile);
      if (partial) {
        suggestions.push("typography:guide-from-base");
        if (!hasPrimaryFont(profile)) notes.push("No primary font role detected.");
        if (!hasHeadingCoverage(profile))
          notes.push("Heading steps (≈h1–h3) not fully covered.");
      }
      rows.push({
        category,
        label,
        count,
        status: partial ? "partial" : "rendered",
        notes: notes.length ? notes : undefined,
        suggestions,
      });
      continue;
    }

    if (category === "assets") {
      const missing = !hasLogoAsset(profile);
      if (missing) {
        suggestions.push("assets:upload-logo");
        notes.push("No logo asset or primary logo path.");
      }
      rows.push({
        category,
        label,
        count,
        status: missing ? "missing" : "rendered",
        notes: notes.length ? notes : undefined,
        suggestions,
      });
      continue;
    }

    rows.push({
      category,
      label,
      count,
      status: count > 0 ? "rendered" : "missing",
      notes:
        count === 0
          ? [`No ${label.toLowerCase()} tokens detected in this scan.`]
          : undefined,
      suggestions: [],
    });
  }

  return rows;
}
