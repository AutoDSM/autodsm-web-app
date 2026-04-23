import type { BrandZIndex } from "@/lib/brand/types";
import type { ThemeValueMap } from "./tailwind-config";

export function inferZIndexRole(value: number): string | undefined {
  if (value >= 9000) return "Toast and notifications";
  if (value >= 1000) return "Modal overlays";
  if (value >= 500) return "Dropdowns and popovers";
  if (value >= 100) return "Fixed headers";
  if (value >= 10) return "Elevated UI";
  return undefined;
}

export function buildZIndex(
  zIndex: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandZIndex[] {
  return Object.entries(zIndex)
    .filter(([, v]) => v !== "auto")
    .map(([name, value]) => {
      const num = parseInt(value) || 0;
      return {
        name,
        value: num,
        tailwindClass: `z-${name}`,
        source,
        isCustom,
        inferredRole: inferZIndexRole(num),
      };
    });
}
