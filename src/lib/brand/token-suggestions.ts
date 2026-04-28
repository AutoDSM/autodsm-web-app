import type { BrandProfile } from "./types";
import { generateColorScale, type ColorScale } from "./color-scale";
import { buildTypographyGuide, type TypographyGuideEntry } from "./typography-guide";
import { pickProjectTintColor } from "./product-tint";

export type Suggestion =
  | { id: "colors:scale-from-primary"; baseHex: string; preview: ColorScale }
  | { id: "colors:scale-from-secondary"; baseHex: string; preview: ColorScale }
  | { id: "typography:guide-from-base"; preview: TypographyGuideEntry[] }
  | { id: "assets:upload-logo" };

export function pickSecondaryTintColor(profile: BrandProfile): string | null {
  const palette = profile.colors.filter(
    (c) => !/-(foreground|fg|text)$/i.test(c.name),
  );
  const secondary = palette.find(
    (c) =>
      /secondary/i.test(c.name) ||
      c.cssVariable === "--secondary" ||
      c.cssVariable === "--color-secondary",
  );
  if (secondary?.value) return secondary.value;
  const accent = palette.find((c) => c.group === "accent");
  if (accent?.value) return accent.value;
  const primaryHex = pickProjectTintColor(profile);
  const nonPrimary = palette.find((c) => c.value && c.value !== primaryHex);
  return nonPrimary?.value ?? null;
}

/**
 * Deterministic AutoDSM suggestions for the review / apply flows.
 */
export function buildSuggestions(profile: BrandProfile): Suggestion[] {
  const out: Suggestion[] = [];

  const primary = pickProjectTintColor(profile);
  if (primary) {
    try {
      out.push({
        id: "colors:scale-from-primary",
        baseHex: primary,
        preview: generateColorScale(primary, { anchor: 600 }),
      });
    } catch {
      /* skip */
    }
  }

  const secondary = pickSecondaryTintColor(profile);
  if (secondary && secondary !== primary) {
    try {
      out.push({
        id: "colors:scale-from-secondary",
        baseHex: secondary,
        preview: generateColorScale(secondary, { anchor: 600 }),
      });
    } catch {
      /* skip */
    }
  }

  out.push({
    id: "typography:guide-from-base",
    preview: buildTypographyGuide({
      typography: profile.typography,
      fonts: profile.fonts,
    }),
  });

  out.push({ id: "assets:upload-logo" });

  return out;
}
