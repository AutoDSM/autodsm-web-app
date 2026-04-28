import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize raw SVG bytes for safe storage and `<img>` rendering.
 * Strips scripts/event handlers; returns null when unusable.
 */
export function sanitizeSvg(buffer: Buffer): Buffer | null {
  try {
    const raw = buffer.toString("utf-8");
    const safe = DOMPurify.sanitize(raw, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ["script", "foreignObject"],
      FORBID_ATTR: ["onload", "onclick", "onerror", "onmouseover"],
      ALLOW_DATA_ATTR: false,
    });
    if (!safe || !safe.includes("<svg")) return null;
    return Buffer.from(safe, "utf-8");
  } catch {
    return null;
  }
}
