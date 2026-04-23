import type { BrandColor, ColorGroup } from "@/lib/brand/types";
import type { CssVarsResult } from "./css-vars";
import {
  toHex,
  toHsl,
  toRgbString,
  toOklchString,
  contrastRatio,
  classifyGroup,
} from "./color-utils";
import { isCssColor } from "./extract-helpers";

function buildColorToken(
  name: string,
  cssVariable: string,
  value: string,
  source: string,
  darkValue: string | undefined,
  varMap: Record<string, string>
): BrandColor | null {
  const hex = toHex(value, varMap);
  if (!hex) return null;

  const hsl = toHsl(value, varMap);
  const rgb = toRgbString(value, varMap);
  const oklch = toOklchString(value, varMap);

  const cw = contrastRatio(hex, "#ffffff");
  const cb = contrastRatio(hex, "#000000");

  const darkHex = darkValue ? (toHex(darkValue, varMap) ?? undefined) : undefined;

  const group: ColorGroup = classifyGroup(name);

  return {
    name,
    cssVariable,
    value: hex,
    hsl,
    rgb,
    oklch,
    group,
    source,
    darkModeValue: darkValue,
    darkModeHex: darkHex,
    contrastOnWhite: Math.round(cw * 100) / 100,
    contrastOnBlack: Math.round(cb * 100) / 100,
    wcagAANormal: cw >= 4.5 || cb >= 4.5,
    wcagAALarge: cw >= 3 || cb >= 3,
    wcagAAA: cw >= 7 || cb >= 7,
  };
}

export function cssVarsToColors(
  cssResult: CssVarsResult,
  source: string
): BrandColor[] {
  const colors: BrandColor[] = [];
  const allVars = { ...cssResult.lightVars, ...cssResult.themeVars };
  const varMap = allVars;

  for (const [varName, value] of Object.entries(allVars)) {
    if (!isCssColor(value)) continue;
    const name = varName.replace(/^--/, "");
    const darkValue = cssResult.darkVars[varName];
    const token = buildColorToken(name, varName, value, source, darkValue, varMap);
    if (token) colors.push(token);
  }
  return colors;
}

export { buildColorToken };
