import { describe, it, expect } from "vitest";
import { buildSpacing } from "./spacing";
import { TAILWIND_DEFAULTS } from "./tailwind-config";

describe("buildSpacing", () => {
  it("merges default spacing in sorted px order (snapshot)", () => {
    const s = buildSpacing(TAILWIND_DEFAULTS.spacing, false, "fixtures");
    expect(s.slice(0, 5)).toMatchSnapshot();
  });
});
