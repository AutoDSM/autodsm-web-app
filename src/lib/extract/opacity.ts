import type { BrandOpacity } from "@/lib/brand/types";
import type { ThemeValueMap } from "./tailwind-config";

export function buildOpacity(
  opacity: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandOpacity[] {
  return Object.entries(opacity).map(([name, value]) => {
    const num = parseFloat(value);
    return {
      name,
      value: isNaN(num) ? 0 : num,
      percentage: isNaN(num) ? "0%" : `${Math.round(num * 100)}%`,
      source,
      isCustom,
    };
  });
}
