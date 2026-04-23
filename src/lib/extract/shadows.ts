import type { BrandShadow, ShadowLayer } from "@/lib/brand/types";
import { toHex } from "./color-utils";
import type { ThemeValueMap } from "./tailwind-config";

const DIM_RE = /^-?[\d.]+(?:px|rem|em|%)?$/;

/**
 * Splits a box-shadow list on top-level commas (not inside parentheses).
 */
function splitShadowList(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function extractColorAndDims(
  part: string
): { dims: string[]; color: string; colorVarRef: string | undefined; inset: boolean } {
  let rest = part.trim();
  let inset = false;
  if (rest.toLowerCase().startsWith("inset ")) {
    inset = true;
    rest = rest.slice(6).trim();
  }

  // Match `var(…)` or color functions or hex at the end
  const varRe = /var\(\s*--[\w-]+\s*\)\s*$/;
  if (varRe.test(rest)) {
    const m = rest.match(varRe);
    if (m) {
      const color = m[0].trim();
      const before = rest.slice(0, rest.length - m[0].length).trim();
      return {
        dims: before ? before.split(/\s+/).filter(Boolean) : [],
        color,
        colorVarRef: color,
        inset,
      };
    }
  }

  if (rest.endsWith(")")) {
    // Walk back to the opening of rgba/rgb/hsl( … )
    let i = rest.length - 1;
    let paren = 0;
    while (i >= 0) {
      if (rest[i] === ")") paren++;
      if (rest[i] === "(") {
        paren--;
        if (paren === 0) {
          const segment = rest.slice(i);
          if (/^rgba?\s*\(/i.test(segment) || /^hsla?\s*\(/i.test(segment)) {
            const color = rest.slice(i).trim();
            const before = rest.slice(0, i).trim();
            return {
              dims: before ? before.split(/\s+/).filter(Boolean) : [],
              color,
              colorVarRef: undefined,
              inset,
            };
          }
          break;
        }
      }
      i--;
    }
  }

  const hexM = rest.match(/#[0-9a-fA-F]{3,8}\s*$/);
  if (hexM) {
    const color = hexM[0].trim();
    const before = rest.slice(0, rest.length - color.length).trim();
    return {
      dims: before ? before.split(/\s+/).filter(Boolean) : [],
      color,
      colorVarRef: undefined,
      inset,
    };
  }

  // Fallback: last token = color, prior tokens = dimensions
  const tokens = rest.split(/\s+/);
  if (tokens.length < 1) {
    return { dims: [], color: "", colorVarRef: undefined, inset };
  }
  const color = tokens[tokens.length - 1] ?? "";
  const dims = tokens.slice(0, -1);
  return {
    dims,
    color,
    colorVarRef: color.startsWith("var(") ? color : undefined,
    inset,
  };
}

export function parseShadowLayers(value: string): ShadowLayer[] {
  const layers: ShadowLayer[] = [];
  if (!value || value === "none") return layers;

  for (const part of splitShadowList(value)) {
    if (!part.trim()) continue;
    const { dims, color, colorVarRef, inset } = extractColorAndDims(part);
    const dimRe = DIM_RE;
    const parsed: string[] = [];
    for (const tok of dims) {
      if (dimRe.test(tok) && parsed.length < 4) parsed.push(tok);
    }
    if (color && dimRe.test(color) && parsed.length < 4) {
      parsed.push(color);
    }
    let col = color;
    if (!col) {
      col = "transparent";
    }
    const hex = toHex(col) ?? (colorVarRef ? "#888888" : col);

    layers.push({
      offsetX: parsed[0] ?? "0",
      offsetY: parsed[1] ?? "0",
      blur: parsed[2] ?? "0",
      spread: parsed[3] ?? "0",
      color: col,
      colorHex: hex,
      colorVarRef,
      inset,
    });
  }
  return layers;
}

function collectTokenRefs(layers: ShadowLayer[]): string[] {
  const set = new Set<string>();
  for (const l of layers) {
    if (l.colorVarRef) set.add(l.colorVarRef);
  }
  return Array.from(set);
}

export function buildShadows(
  shadows: ThemeValueMap,
  isCustom: boolean,
  source: string
): BrandShadow[] {
  return Object.entries(shadows).map(([name, value]) => {
    const layers = parseShadowLayers(value);
    const refs = collectTokenRefs(layers);
    return {
      name,
      tailwindClass: name === "DEFAULT" ? "shadow" : `shadow-${name}`,
      value,
      layers,
      tokenRefs: refs.length ? refs : undefined,
      source,
      isCustom,
    };
  });
}
