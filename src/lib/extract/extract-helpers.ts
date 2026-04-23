/** Shared small helpers for token extractors. */

export function isCssColor(value: string): boolean {
  if (!value) return false;
  const v = value.trim();
  if (
    v.startsWith("#") ||
    v.startsWith("rgb") ||
    v.startsWith("hsl") ||
    v.startsWith("oklch") ||
    v.startsWith("color(") ||
    /^[a-zA-Z]+$/.test(v)
  )
    return true;
  if (/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/.test(v))
    return true;
  return false;
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
