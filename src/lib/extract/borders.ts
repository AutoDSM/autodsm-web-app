import type { BrandBorder } from "@/lib/brand/types";
import { toHex } from "./color-utils";
import type { ThemeValueMap } from "./tailwind-config";
import { isCssColor } from "./extract-helpers";
import { dedupeByName } from "./extract-helpers";

export function buildBorders(
  lightVars: Record<string, string>,
  source: string
): BrandBorder[] {
  const borders: BrandBorder[] = [];
  const varMap = lightVars;

  const borderVarNames = Object.keys(lightVars).filter((v) => {
    const n = v.replace(/^--/, "");
    return /border|input|ring/.test(n);
  });

  for (const varName of borderVarNames) {
    const value = lightVars[varName];
    const name = varName.replace(/^--/, "");
    const hex = toHex(value, varMap) ?? "#e5e7eb";
    borders.push({
      name,
      width: "1px",
      style: "solid",
      color: hex,
      colorToken: varName,
      source,
      borderGroup: "source",
    });
  }

  if (borders.length === 0) {
    borders.push({
      name: "default",
      width: "1px",
      style: "solid",
      color: "#e5e7eb",
      source,
      borderGroup: "source",
    });
  }
  return borders;
}

/**
 * Add Tailwind `borderWidth`, `borderColor`, and `borderStyle` theme keys as
 * `BrandBorder` entries (in addition to CSS `buildBorders` output).
 */
export function buildBordersFromTailwindTheme(
  borderWidth: ThemeValueMap,
  borderColor: ThemeValueMap,
  borderStyle: ThemeValueMap,
  isCustom: boolean,
  source: string,
  varMap: Record<string, string>
): BrandBorder[] {
  const out: BrandBorder[] = [];
  for (const [k, w] of Object.entries(borderWidth)) {
    if (k === "DEFAULT") continue;
    out.push({
      name: `w-${k}`,
      width: w,
      style: "solid",
      color: toHex("#e5e7eb", varMap) ?? "#e5e7eb",
      source: isCustom ? source : "tailwind-default",
      borderGroup: "width",
    });
  }
  for (const [k, c] of Object.entries(borderColor)) {
    if (k === "DEFAULT") continue;
    if (!isCssColor(c)) continue;
    const hx = toHex(c, varMap) ?? c;
    out.push({
      name: `c-${k}`,
      width: "1px",
      style: "solid",
      color: hx,
      source: isCustom ? source : "tailwind-default",
      borderGroup: "color",
    });
  }
  for (const [k, s] of Object.entries(borderStyle)) {
    if (k === "DEFAULT") continue;
    out.push({
      name: `s-${k}`,
      width: "1px",
      style: s,
      color: toHex("#9ca3af", varMap) ?? "#9ca3af",
      source: isCustom ? source : "tailwind-default",
      borderGroup: "style",
    });
  }
  return out;
}

export function mergeBorders(
  fromCss: BrandBorder[],
  fromTailwind: BrandBorder[]
): BrandBorder[] {
  return dedupeByName([...fromCss, ...fromTailwind]);
}
