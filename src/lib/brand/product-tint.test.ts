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
  it("emits the project tint plus accent tokens", () => {
    const s = buildProjectTintStyle("#0ea5e9", "light") as Record<string, string | number>;
    expect(s["--project-tint"]).toBe("#0ea5e9");
    expect(s["--accent"]).toBeDefined();
    expect(s["--accent-fg"]).toBeDefined();
    expect(s["--accent-subtle"]).toBeDefined();
  });
});

describe("meetsAaLargeTextOnAccent", () => {
  it("returns true for strong pair", () => {
    expect(meetsAaLargeTextOnAccent("#0a0a0b", "#ffffff")).toBe(true);
  });
});

describe("pickProjectTintColor foreground filter", () => {
  it("ignores -foreground variants when picking a tint", () => {
    const profile = {
      colors: [
        {
          name: "primary-foreground",
          value: "#ffffff",
          group: "brand" as const,
        },
        {
          name: "primary",
          value: "#0ea5e9",
          group: "brand" as const,
        },
      ],
    } as unknown as Parameters<typeof pickProjectTintColor>[0];
    expect(pickProjectTintColor(profile)).toBe("#0ea5e9");
  });

  it("prefers darkModeHex in dark mode", () => {
    const profile = {
      colors: [
        {
          name: "primary",
          value: "#0ea5e9",
          darkModeHex: "#1e3a8a",
          group: "brand" as const,
        },
      ],
    } as unknown as Parameters<typeof pickProjectTintColor>[0];
    expect(pickProjectTintColor(profile, "dark")).toBe("#1e3a8a");
    expect(pickProjectTintColor(profile, "light")).toBe("#0ea5e9");
  });
});
