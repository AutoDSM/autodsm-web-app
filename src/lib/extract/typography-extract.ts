import type { BrandBreakpoint, BrandTypography } from "@/lib/brand/types";
import { remToPx } from "./extract-helpers";
import type { ThemeValueMap } from "./tailwind-config";

const tailwindSizeMap: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
  "6xl": "text-6xl",
  "7xl": "text-7xl",
  "8xl": "text-8xl",
  "9xl": "text-9xl",
};

const categoryMap: Record<string, BrandTypography["category"]> = {
  xs: "utility",
  sm: "utility",
  base: "body",
  lg: "body",
  xl: "body",
  "2xl": "heading",
  "3xl": "heading",
  "4xl": "heading",
  "5xl": "heading",
  "6xl": "display",
  "7xl": "display",
  "8xl": "display",
  "9xl": "display",
};

export function buildTypography(
  fontSize: ThemeValueMap,
  fontFamily: ThemeValueMap,
  fontWeight: ThemeValueMap,
  lineHeight: ThemeValueMap,
  source: string
): BrandTypography[] {
  const primaryFamily =
    fontFamily["sans"] ?? fontFamily["DEFAULT"] ?? "sans-serif";

  const defaultWeight = fontWeight["normal"] ?? "400";

  return Object.entries(fontSize).map(([name, value]) => {
    const sizeStr = value.split(",")[0].replace(/[["']/g, "").trim();
    const px = remToPx(sizeStr);
    const lhKey = name in lineHeight ? name : "normal";
    const lhVal = lineHeight[lhKey] ?? "1.5";
    const lhPx = remToPx(lhVal) || Math.round(px * 1.5);

    return {
      name,
      fontFamily: primaryFamily,
      fontSize: sizeStr,
      fontSizePx: px,
      fontWeight: defaultWeight,
      fontWeightNumeric: parseInt(defaultWeight) || 400,
      lineHeight: lhVal,
      lineHeightPx: lhPx || undefined,
      source,
      category: categoryMap[name] ?? "utility",
      tailwindClass: tailwindSizeMap[name],
    };
  });
}

export function buildBreakpoints(
  screens: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandBreakpoint[] {
  return Object.entries(screens).map(([name, value]) => {
    const px = parseInt(value) || 0;
    return {
      name,
      value,
      px,
      source,
      isCustom,
    };
  });
}
