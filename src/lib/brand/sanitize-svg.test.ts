import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./sanitize-svg";

describe("sanitizeSvg", () => {
  it("strips script tags", () => {
    const raw = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="1" height="1"/></svg>`,
    );
    const out = sanitizeSvg(raw);
    expect(out).not.toBeNull();
    expect(out!.toString()).not.toContain("script");
  });

  it("rejects SVG without root svg element", () => {
    expect(sanitizeSvg(Buffer.from("<div/>"))).toBeNull();
  });
});
