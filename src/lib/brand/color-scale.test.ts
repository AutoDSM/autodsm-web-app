import { describe, expect, it } from "vitest";
import { converter } from "culori";
import { generateColorScale, minContrastVsWhite700to900 } from "./color-scale";

const toOklch = converter("oklch");

describe("generateColorScale", () => {
  it("matches snapshots for known brand inputs", () => {
    expect(generateColorScale("#8f23fa")).toMatchSnapshot();
    expect(generateColorScale("#ef4444")).toMatchSnapshot();
    expect(generateColorScale("#2563eb")).toMatchSnapshot();
  });

  it("has monotonic OKLch lightness across the ramp", () => {
    const scale = generateColorScale("#8f23fa");
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
    for (let i = 0; i < steps.length - 1; i++) {
      const a = toOklch(scale[steps[i]]);
      const b = toOklch(scale[steps[i + 1]]);
      expect(a?.l).toBeDefined();
      expect(b?.l).toBeDefined();
      expect((a!.l ?? 0) > (b!.l ?? 0)).toBe(true);
    }
  });

  it("meets contrast vs white for upper ramp", () => {
    const scale = generateColorScale("#8f23fa");
    expect(minContrastVsWhite700to900(scale)).toBeGreaterThanOrEqual(4.5);
  });
});
