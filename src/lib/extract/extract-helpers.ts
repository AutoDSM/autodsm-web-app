/** Shared small helpers for token extractors. */

/**
 * Curated set of bare CSS color keywords. We avoid `^[a-z]+$` because that
 * matches things like `inherit`, `auto`, or arbitrary identifiers that aren't
 * colors (and end up bleeding into the dashboard).
 */
const CSS_NAMED_COLORS = new Set<string>([
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque",
  "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood",
  "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk",
  "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray",
  "darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen",
  "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
  "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise",
  "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue",
  "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro",
  "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey",
  "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender",
  "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral",
  "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey",
  "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray",
  "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen",
  "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue",
  "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue",
  "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue",
  "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace",
  "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod",
  "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff",
  "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red",
  "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen",
  "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray",
  "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle",
  "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow",
  "yellowgreen",
  // CSS-wide keywords that produce a color in context.
  "currentcolor", "transparent",
]);

/**
 * Heuristic CSS color detector. Recognises hex, rgb()/rgba(), hsl()/hsla(),
 * oklch(), color(), the bare `H S% L%` Shadcn convention, and a curated set
 * of named CSS colors. Returns false for arbitrary identifiers like
 * `inherit`, `auto`, or token names so we don't poison the colors panel.
 */
export function isCssColor(value: string): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (
    v.startsWith("#") ||
    v.startsWith("rgb") ||
    v.startsWith("hsl") ||
    v.startsWith("oklch") ||
    v.startsWith("oklab") ||
    v.startsWith("lab(") ||
    v.startsWith("lch(") ||
    v.startsWith("color(")
  ) {
    return true;
  }
  // Shadcn bare H S% L% (with optional / alpha).
  if (
    /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%(?:\s*\/\s*[\d.]+)?$/.test(v)
  ) {
    return true;
  }
  return CSS_NAMED_COLORS.has(v.toLowerCase());
}

export function remToPx(rem: string): number {
  const match = rem.match(/^([\d.]+)rem$/);
  if (match) return Math.round(parseFloat(match[1]) * 16);
  const px = rem.match(/^([\d.]+)px$/);
  if (px) return Math.round(parseFloat(px[1]));
  const plain = parseFloat(rem);
  if (!isNaN(plain)) return Math.round(plain * 16);
  return 0;
}

export function pxToRem(px: number): string {
  return `${(px / 16).toFixed(4).replace(/\.?0+$/, "")}rem`;
}

export function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}
