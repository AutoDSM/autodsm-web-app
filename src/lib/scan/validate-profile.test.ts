import { describe, expect, it } from "vitest";
import { validateBrandProfile } from "./validate-profile";

function baseProfile() {
  return {
    repo: { owner: "x", name: "y", branch: "main", url: "" },
    scannedAt: "",
    scannedFromSha: "",
    colors: [],
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
    meta: { filesScanned: 0, cssSource: "", tailwindConfigPath: null, shadcnConfigPath: null, tailwindVersion: null },
  };
}

describe("validateBrandProfile", () => {
  it("accepts a structurally valid profile", () => {
    expect(validateBrandProfile(baseProfile()).ok).toBe(true);
  });

  it("rejects non-object input", () => {
    const r = validateBrandProfile(null);
    expect(r.ok).toBe(false);
  });

  it("rejects missing array category", () => {
    const p = baseProfile() as Record<string, unknown>;
    delete p.colors;
    const r = validateBrandProfile(p);
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.reason).toMatch(/colors/);
  });

  it("rejects missing meta", () => {
    const p = baseProfile() as Record<string, unknown>;
    delete p.meta;
    const r = validateBrandProfile(p);
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.reason).toMatch(/meta/);
  });

  it("rejects NaN typography font sizes", () => {
    const p = baseProfile();
    p.typography.push({ fontSizePx: Number.NaN } as never);
    const r = validateBrandProfile(p);
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.reason).toMatch(/fontSizePx/);
  });

  it("rejects NaN breakpoint px", () => {
    const p = baseProfile();
    p.breakpoints.push({ px: Number.POSITIVE_INFINITY } as never);
    const r = validateBrandProfile(p);
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.reason).toMatch(/px/);
  });
});
