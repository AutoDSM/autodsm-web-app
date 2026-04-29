import { describe, expect, it } from "vitest";
import type { BrandColor, BrandProfile } from "./types";
import { finalizeBrandProfile } from "./finalize-profile";

function makeColor(overrides: Partial<BrandColor>): BrandColor {
  return {
    name: "primary",
    cssVariable: "--primary",
    value: "#8f23fa",
    hsl: "0 0% 0%",
    rgb: "rgb(0,0,0)",
    group: "brand",
    source: "test",
    contrastOnWhite: 0,
    contrastOnBlack: 0,
    wcagAANormal: false,
    wcagAALarge: false,
    wcagAAA: false,
    ...overrides,
  };
}

function emptyProfile(): BrandProfile {
  return {
    repo: { owner: "o", name: "n", branch: "main", url: "https://example.com" },
    scannedAt: "2026-04-28T00:00:00Z",
    scannedFromSha: "deadbeef",
    colors: [makeColor({})],
    typography: [],
    fonts: [],
    spacing: [],
    shadows: [],
    radii: [],
    borders: [],
    animations: [],
    breakpoints: [],
    opacity: [],
    zIndex: [],
    gradients: [],
    assets: [],
    meta: {
      filesScanned: 0,
      cssSource: "",
      tailwindConfigPath: null,
      shadcnConfigPath: null,
      tailwindVersion: null,
    },
  };
}

describe("finalizeBrandProfile", () => {
  it("merges a brand-primary-{50..900} ramp when missing", () => {
    const before = emptyProfile();
    const after = finalizeBrandProfile(before);
    const ramp = after.colors.filter((c) =>
      c.cssVariable.startsWith("--brand-primary-"),
    );
    expect(ramp).toHaveLength(10);
    expect(ramp.map((r) => r.cssVariable).sort()).toEqual(
      [
        "--brand-primary-50",
        "--brand-primary-100",
        "--brand-primary-200",
        "--brand-primary-300",
        "--brand-primary-400",
        "--brand-primary-500",
        "--brand-primary-600",
        "--brand-primary-700",
        "--brand-primary-800",
        "--brand-primary-900",
      ].sort(),
    );
    expect(after.meta.tokenChoices?.acceptedSuggestions).toContain(
      "colors:scale-from-primary",
    );
  });

  it("does not duplicate the ramp when re-finalized", () => {
    const before = emptyProfile();
    const once = finalizeBrandProfile(before);
    const twice = finalizeBrandProfile(once);
    const rampOnce = once.colors.filter((c) =>
      c.cssVariable.startsWith("--brand-primary-"),
    ).length;
    const rampTwice = twice.colors.filter((c) =>
      c.cssVariable.startsWith("--brand-primary-"),
    ).length;
    expect(rampOnce).toBe(10);
    expect(rampTwice).toBe(10);
  });

  it("appends typography guide rows when no primary font / heading coverage", () => {
    const before = emptyProfile();
    const after = finalizeBrandProfile(before);
    const guideRows = after.typography.filter(
      (t) => t.guideOrigin === "autodsm-guide",
    );
    expect(guideRows.length).toBeGreaterThan(0);
    expect(after.meta.typographyGuide).toBeTruthy();
  });

  it("auto-promotes primaryLogoPath when a logo asset exists and meta is empty", () => {
    const before = emptyProfile();
    before.assets = [
      {
        name: "logo",
        path: "public/logo.svg",
        type: "svg",
        category: "logo",
        fileSize: 1024,
        fileSizeFormatted: "1 KB",
      },
    ];
    const after = finalizeBrandProfile(before);
    expect(after.meta.primaryLogoPath).toBe("public/logo.svg");
  });

  it("does not stamp tokenChoices when nothing was applied", () => {
    const before = emptyProfile();
    // Pre-seed a primary ramp + a guide row so finalize has nothing to do.
    before.colors.push(
      makeColor({
        name: "brand-primary-600",
        cssVariable: "--brand-primary-600",
        value: "#5e1bb3",
        group: "brand",
        source: "autodsm-generated",
        fillOrigin: "autodsm-generated",
      }),
    );
    before.typography.push({
      name: "guide-h1",
      fontFamily: "Inter",
      fontSize: "32px",
      fontSizePx: 32,
      fontWeight: "600",
      fontWeightNumeric: 600,
      lineHeight: "1.2",
      source: "autodsm-guide",
      category: "heading",
      guideOrigin: "autodsm-guide",
    });
    const after = finalizeBrandProfile(before);
    expect(after.meta.tokenChoices).toBeUndefined();
  });
});
