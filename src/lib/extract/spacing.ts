import type { BrandSpacing } from "@/lib/brand/types";
import type { ThemeValueMap } from "./tailwind-config";
import { remToPx, pxToRem } from "./extract-helpers";

function tailwindSpacingClasses(name: string): string[] {
  if (name === "DEFAULT") {
    return [
      "p-DEFAULT",
      "m-DEFAULT",
      "gap-DEFAULT",
      "space-x-DEFAULT",
      "space-y-DEFAULT",
    ];
  }
  return [
    `p-${name}`,
    `m-${name}`,
    `gap-${name}`,
    `space-x-${name}`,
    `space-y-${name}`,
  ];
}

export function buildSpacing(
  spacing: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandSpacing[] {
  const result: BrandSpacing[] = [];
  for (const [name, value] of Object.entries(spacing)) {
    const px = remToPx(value);
    result.push({
      name,
      tailwindClasses: tailwindSpacingClasses(name),
      rem: value.includes("rem") ? value : value === "0px" ? "0rem" : pxToRem(px),
      px,
      source,
      isCustom,
    });
  }
  return result.sort((a, b) => a.px - b.px);
}
