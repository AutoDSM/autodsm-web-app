import { describe, expect, it } from "vitest";
import { SCAN_PHASE_ORDER, scanPhaseIndex } from "./scan-phases";

describe("scanPhaseIndex", () => {
  it("orders canonical phases", () => {
    expect(SCAN_PHASE_ORDER[0]).toBe("fetch_meta");
    expect(SCAN_PHASE_ORDER[SCAN_PHASE_ORDER.length - 1]).toBe("done");
  });

  it("returns index for known phases", () => {
    expect(scanPhaseIndex("fetch_tree")).toBe(1);
    expect(scanPhaseIndex("build_profile")).toBe(5);
    expect(scanPhaseIndex("done")).toBe(8);
  });

  it("returns -1 for unknown or empty", () => {
    expect(scanPhaseIndex(null)).toBe(-1);
    expect(scanPhaseIndex(undefined)).toBe(-1);
    expect(scanPhaseIndex("nope")).toBe(-1);
  });
});
