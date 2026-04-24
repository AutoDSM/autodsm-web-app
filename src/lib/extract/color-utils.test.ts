import { describe, expect, it } from "vitest";
import { toHex, toOklchString } from "./color-utils";

describe("color-utils.parseSafe (via toHex)", () => {
  it("parses a hex literal", () => {
    expect(toHex("#ff0000")).toBe("#ff0000");
  });

  it("parses shadcn bare H S% L%", () => {
    expect(toHex("0 100% 50%")).toBe("#ff0000");
  });

  it("parses shadcn bare H S% L% / A (alpha)", () => {
    const out = toHex("0 100% 50% / 0.5");
    expect(out).toBeTruthy();
  });

  it("resolves var(--token) via varMap", () => {
    expect(toHex("var(--brand)", { "--brand": "#00ff00" })).toBe("#00ff00");
  });

  it("honours var() fallback", () => {
    expect(toHex("var(--missing, #112233)")).toBe("#112233");
  });

  it("resolves Tailwind v4 alpha shorthand hsl(var(--x) / 0.5)", () => {
    const out = toHex("hsl(var(--brand) / 0.5)", { "--brand": "0 100% 50%" });
    expect(out).toBeTruthy();
  });
});

describe("toOklchString enrichment", () => {
  it("produces an oklch string for a non-oklch input", () => {
    const out = toOklchString("#3366ff");
    expect(out).toMatch(/^oklch\(/);
  });
});
