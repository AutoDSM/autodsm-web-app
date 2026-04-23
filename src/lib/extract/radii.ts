import type { BrandRadius } from "@/lib/brand/types";
import { remToPx } from "./extract-helpers";
import type { ThemeValueMap } from "./tailwind-config";

export function buildRadii(
  radii: ThemeValueMap,
  isCustom: boolean,
  source: string,
  cssVarMap?: Record<string, string>
): BrandRadius[] {
  return Object.entries(radii).map(([name, value]) => {
    const px = remToPx(value);
    const cssVariable = value.startsWith("var(")
      ? value.match(/var\((--[\w-]+)\)/)?.[1]
      : undefined;
    const resolvedValue =
      cssVariable && cssVarMap?.[cssVariable]
        ? cssVarMap[cssVariable]
        : value;
    const resolvedPx = remToPx(resolvedValue);
    return {
      name,
      tailwindClass: name === "DEFAULT" ? "rounded" : `rounded-${name}`,
      value: resolvedValue,
      px: resolvedPx || px,
      cssVariable,
      source,
      isCustom,
    };
  });
}
