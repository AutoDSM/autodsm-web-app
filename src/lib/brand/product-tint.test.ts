import { describe, expect, it } from "vitest";
import { buildDemoBrandProfile } from "./demo-profile";
import {
  buildProjectTintStyle,
  meetsAaLargeTextOnAccent,
  pickProjectTintColor,
  resolveAccentOnAccent,
} from "./product-tint";
import { wcagContrast } from "culori";

describe("pickProjectTintColor", () => {
  it("prefers brand primary", () => {
    const p = buildDemoBrandProfile("o", "r");
    expect(pickProjectTintColor(p)).toBe("#8f23fa");
  });

  it("returns null with no profile", () => {
    expect(pickProjectTintColor(null)).toBeNull();
  });
});

describe("resolveAccentOnAccent", () => {
  it("keeps a saturated purple and white onAccent", () => {
    const { accent, onAccent } = resolveAccentOnAccent("#8f23fa");
    expect(wcagContrast(onAccent, accent)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("buildProjectTintStyle", () => {
  it("sets 8% mixed elevated and accent tokens", () => {
    const s = buildProjectTintStyle("#0ea5e9", "light") as Record<string, string | number>;
    expect(s["--project-tint"]).toBe("#0ea5e9");
    expect(String(s["--bg-elevated"])).toContain("8%");
    expect(String(s["--bg-elevated"])).toContain("var(--bg-primary)");
    expect(s["--accent"]).toBeDefined();
  });
});

describe("meetsAaLargeTextOnAccent", () => {
  it("returns true for strong pair", () => {
    expect(meetsAaLargeTextOnAccent("#0a0a0b", "#ffffff")).toBe(true);
  });
});
