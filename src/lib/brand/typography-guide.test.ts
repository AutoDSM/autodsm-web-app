import { describe, expect, it } from "vitest";
import { buildDemoBrandProfile } from "./demo-profile";
import { buildTypographyGuide } from "./typography-guide";

describe("buildTypographyGuide", () => {
  it("returns 9 rows with system fallback when empty", () => {
    const rows = buildTypographyGuide({ typography: [], fonts: [] });
    expect(rows).toHaveLength(9);
    expect(rows[0].role).toBe("h1");
    expect(rows[rows.length - 1].role).toBe("caption");
    expect(rows[0].fontFamily).toContain("system-ui");
  });

  it("demo profile yields monotonic sizes and body1 near base", () => {
    const profile = buildDemoBrandProfile("acme", "web");
    const rows = buildTypographyGuide({
      typography: profile.typography,
      fonts: profile.fonts,
    });
    expect(rows).toHaveLength(9);
    const sizes = rows.map((r) => r.fontSizePx);
    for (let i = 0; i < sizes.length - 1; i++) {
      expect(sizes[i]).toBeGreaterThan(sizes[i + 1]);
    }
    const body1 = rows.find((r) => r.role === "body1");
    expect(body1?.fontSizePx).toBeGreaterThanOrEqual(14);
    expect(body1?.fontSizePx).toBeLessThanOrEqual(20);
  });
});
