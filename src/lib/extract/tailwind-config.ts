/**
 * tailwind-config.ts — Babel AST parser for tailwind.config.{ts,js,cjs,mjs}.
 * Extracts the full `theme` and `theme.extend` objects into a normalized map.
 * PDF §10 — source 1: Tailwind config.
 *
 * Handles: colors, spacing, fontSize, fontFamily, fontWeight, boxShadow,
 *   borderRadius, borderWidth, borderColor, opacity, zIndex, screens,
 *   animation, transitionDuration, transitionTimingFunction, keyframes,
 *   backgroundImage, letterSpacing, lineHeight
 */

import { parse as babelParse } from "@babel/parser";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";

// CJS interop shim
const traverse: typeof import("@babel/traverse").default =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof (_traverse as any).default === "function"
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_traverse as any).default
    : (_traverse as unknown as typeof import("@babel/traverse").default);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeValueMap = Record<string, string>;

export interface ParsedTailwindTheme {
  colors: ThemeValueMap;
  spacing: ThemeValueMap;
  fontSize: ThemeValueMap;
  fontFamily: ThemeValueMap;
  fontWeight: ThemeValueMap;
  boxShadow: ThemeValueMap;
  borderRadius: ThemeValueMap;
  borderWidth: ThemeValueMap;
  borderColor: ThemeValueMap;
  borderStyle: ThemeValueMap;
  opacity: ThemeValueMap;
  zIndex: ThemeValueMap;
  screens: ThemeValueMap;
  animation: ThemeValueMap;
  transitionDuration: ThemeValueMap;
  transitionTimingFunction: ThemeValueMap;
  keyframes: ThemeValueMap;
  backgroundImage: ThemeValueMap;
  letterSpacing: ThemeValueMap;
  lineHeight: ThemeValueMap;
  /** e.g. "tailwind.config.ts" or "tailwind-default" */
  _source: string;
}

const EMPTY_THEME = (): ParsedTailwindTheme => ({
  colors: {},
  spacing: {},
  fontSize: {},
  fontFamily: {},
  fontWeight: {},
  boxShadow: {},
  borderRadius: {},
  borderWidth: {},
  borderColor: {},
  borderStyle: {},
  opacity: {},
  zIndex: {},
  screens: {},
  animation: {},
  transitionDuration: {},
  transitionTimingFunction: {},
  keyframes: {},
  backgroundImage: {},
  letterSpacing: {},
  lineHeight: {},
  _source: "tailwind-default",
});

// ─── Minimal Tailwind defaults ────────────────────────────────────────────────
// A small representative sample — enough to populate token pages.

export const TAILWIND_DEFAULTS: ParsedTailwindTheme = {
  ...EMPTY_THEME(),
  spacing: {
    px: "1px",
    "0": "0px",
    "0.5": "0.125rem",
    "1": "0.25rem",
    "1.5": "0.375rem",
    "2": "0.5rem",
    "2.5": "0.625rem",
    "3": "0.75rem",
    "3.5": "0.875rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "7": "1.75rem",
    "8": "2rem",
    "9": "2.25rem",
    "10": "2.5rem",
    "11": "2.75rem",
    "12": "3rem",
    "14": "3.5rem",
    "16": "4rem",
    "20": "5rem",
    "24": "6rem",
    "28": "7rem",
    "32": "8rem",
    "36": "9rem",
    "40": "10rem",
    "44": "11rem",
    "48": "12rem",
    "52": "13rem",
    "56": "14rem",
    "60": "15rem",
    "64": "16rem",
    "72": "18rem",
    "80": "20rem",
    "96": "24rem",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "3.75rem",
    "7xl": "4.5rem",
    "8xl": "6rem",
    "9xl": "8rem",
  },
  fontWeight: {
    thin: "100",
    extralight: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },
  lineHeight: {
    none: "1",
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "7": "1.75rem",
    "8": "2rem",
    "9": "2.25rem",
    "10": "2.5rem",
  },
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
  borderRadius: {
    none: "0px",
    sm: "0.125rem",
    DEFAULT: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    full: "9999px",
  },
  borderWidth: {
    DEFAULT: "1px",
    "0": "0px",
    "2": "2px",
    "4": "4px",
    "8": "8px",
  },
  borderColor: {
    current: "currentColor",
  },
  borderStyle: {
    solid: "solid",
    dashed: "dashed",
    dotted: "dotted",
    double: "double",
    none: "none",
  },
  opacity: {
    "0": "0",
    "5": "0.05",
    "10": "0.1",
    "15": "0.15",
    "20": "0.2",
    "25": "0.25",
    "30": "0.3",
    "35": "0.35",
    "40": "0.4",
    "45": "0.45",
    "50": "0.5",
    "55": "0.55",
    "60": "0.6",
    "65": "0.65",
    "70": "0.7",
    "75": "0.75",
    "80": "0.8",
    "85": "0.85",
    "90": "0.9",
    "95": "0.95",
    "100": "1",
  },
  zIndex: {
    auto: "auto",
    "0": "0",
    "10": "10",
    "20": "20",
    "30": "30",
    "40": "40",
    "50": "50",
  },
  screens: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
  boxShadow: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
    none: "none",
  },
  fontFamily: {
    sans: "ui-sans-serif, system-ui, sans-serif",
    serif: "ui-serif, Georgia, serif",
    mono: "ui-monospace, SFMono-Regular, monospace",
  },
  animation: {},
  transitionDuration: {
    DEFAULT: "150ms",
    "75": "75ms",
    "100": "100ms",
    "150": "150ms",
    "200": "200ms",
    "300": "300ms",
    "500": "500ms",
    "700": "700ms",
    "1000": "1000ms",
  },
  transitionTimingFunction: {
    DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
    linear: "linear",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  backgroundImage: {},
  keyframes: {},
  colors: {},
  _source: "tailwind-default",
};

// ─── AST helpers ─────────────────────────────────────────────────────────────

/** Extract a static string value from a babel node. Returns raw source for complex nodes. */
function nodeToString(
  node: t.Node | null | undefined,
  rawCode: string
): string | null {
  if (!node) return null;
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return String(node.value);
  if (t.isTemplateLiteral(node)) {
    // only handle purely static template literals
    if (node.expressions.length === 0 && node.quasis.length === 1) {
      return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
    }
  }
  if (t.isArrayExpression(node)) {
    const items: string[] = [];
    for (const el of node.elements) {
      const s = el ? nodeToString(el, rawCode) : null;
      if (s) items.push(s);
    }
    return items.join(", ");
  }
  // Dynamic — return raw source text
  if (node.start !== null && node.end !== null && node.start !== undefined && node.end !== undefined) {
    return rawCode.slice(node.start, node.end);
  }
  return null;
}

/** Flatten an ObjectExpression into a Record<string,string> */
function flattenObject(
  node: t.ObjectExpression,
  rawCode: string,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop)) continue;
    let keyStr: string;
    if (t.isIdentifier(prop.key)) {
      keyStr = prop.key.name;
    } else if (t.isStringLiteral(prop.key)) {
      keyStr = prop.key.value;
    } else if (t.isNumericLiteral(prop.key)) {
      keyStr = String(prop.key.value);
    } else {
      continue;
    }
    const fullKey = prefix ? `${prefix}-${keyStr}` : keyStr;
    const val = prop.value;
    if (t.isObjectExpression(val)) {
      Object.assign(result, flattenObject(val, rawCode, fullKey));
    } else {
      const str = nodeToString(val, rawCode);
      if (str !== null) result[fullKey] = str;
    }
  }
  return result;
}

/**
 * Color-aware flatten that preserves the canonical Tailwind color scheme:
 *
 *   primary: { DEFAULT: "#…", foreground: "#…" }
 *
 * becomes `{ primary: "#…", "primary-foreground": "#…" }` instead of
 * `{ "primary-DEFAULT": "#…", "primary-foreground": "#…" }`. This lets the
 * Colors panel and `pickProjectTintColor` identify `primary` correctly.
 */
function flattenColors(
  node: t.ObjectExpression,
  rawCode: string,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop)) continue;
    let keyStr: string;
    if (t.isIdentifier(prop.key)) {
      keyStr = prop.key.name;
    } else if (t.isStringLiteral(prop.key)) {
      keyStr = prop.key.value;
    } else if (t.isNumericLiteral(prop.key)) {
      keyStr = String(prop.key.value);
    } else {
      continue;
    }

    const val = prop.value;

    if (t.isObjectExpression(val)) {
      const nestedPrefix = prefix ? `${prefix}-${keyStr}` : keyStr;
      // Promote { DEFAULT } so `colors.primary.DEFAULT` => `primary`.
      for (const sub of val.properties) {
        if (!t.isObjectProperty(sub)) continue;
        const subKey = t.isIdentifier(sub.key)
          ? sub.key.name
          : t.isStringLiteral(sub.key)
            ? sub.key.value
            : t.isNumericLiteral(sub.key)
              ? String(sub.key.value)
              : null;
        if (!subKey) continue;
        if (subKey === "DEFAULT" && !t.isObjectExpression(sub.value)) {
          const str = nodeToString(sub.value, rawCode);
          if (str !== null) result[nestedPrefix] = str;
        }
      }
      // Then recurse for the rest of the keys.
      const inner = flattenColors(val, rawCode, nestedPrefix);
      for (const [k, v] of Object.entries(inner)) {
        // Avoid emitting `${parent}-DEFAULT`.
        if (k === `${nestedPrefix}-DEFAULT`) continue;
        result[k] = v;
      }
    } else {
      const str = nodeToString(val, rawCode);
      if (str !== null) {
        const fullKey = prefix ? `${prefix}-${keyStr}` : keyStr;
        result[fullKey] = str;
      }
    }
  }
  return result;
}

/** Extract a specific key from an ObjectExpression */
function getObjectKey(
  node: t.ObjectExpression,
  key: string
): t.Node | null {
  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop)) continue;
    const k = t.isIdentifier(prop.key)
      ? prop.key.name
      : t.isStringLiteral(prop.key)
      ? prop.key.value
      : null;
    if (k === key) return prop.value;
  }
  return null;
}

// ─── Main parser ─────────────────────────────────────────────────────────────

const THEME_KEYS: Array<keyof Omit<ParsedTailwindTheme, "_source">> = [
  "colors",
  "spacing",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "boxShadow",
  "borderRadius",
  "borderWidth",
  "borderColor",
  "borderStyle",
  "opacity",
  "zIndex",
  "screens",
  "animation",
  "transitionDuration",
  "transitionTimingFunction",
  "keyframes",
  "backgroundImage",
  "letterSpacing",
  "lineHeight",
];

/**
 * Parse a tailwind config source file and extract theme tokens.
 * Merges Tailwind defaults (marked "tailwind-default") with any custom values
 * from the file (marked with the provided filePath).
 *
 * Never throws — returns merged defaults on any parse failure.
 */
export function parseTailwindConfig(
  source: string,
  filePath: string
): ParsedTailwindTheme {
  const merged: ParsedTailwindTheme = { ...TAILWIND_DEFAULTS } as ParsedTailwindTheme;
  // Deep-clone the nested objects
  const mergedRec = merged as unknown as Record<string, ThemeValueMap | string>;
  const defaultsRec = TAILWIND_DEFAULTS as unknown as Record<string, ThemeValueMap | string>;
  for (const key of THEME_KEYS) {
    const defaultVal = defaultsRec[key as string];
    mergedRec[key as string] = { ...(defaultVal as ThemeValueMap) };
  }
  merged._source = "tailwind-default";

  let ast: ReturnType<typeof babelParse>;
  try {
    ast = babelParse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: true,
    });
  } catch {
    return merged;
  }

  let themeNode: t.ObjectExpression | null = null;
  let extendNode: t.ObjectExpression | null = null;

  try {
    traverse(ast, {
      // export default { ... }
      ExportDefaultDeclaration(
        path: import("@babel/traverse").NodePath<t.ExportDefaultDeclaration>
      ) {
        const decl = path.node.declaration;
        if (t.isObjectExpression(decl)) {
          const themeVal = getObjectKey(decl, "theme");
          if (themeVal && t.isObjectExpression(themeVal)) {
            themeNode = themeVal;
            const extVal = getObjectKey(themeVal, "extend");
            if (extVal && t.isObjectExpression(extVal)) {
              extendNode = extVal;
            }
          }
        }
      },
      // module.exports = { ... }
      AssignmentExpression(
        path: import("@babel/traverse").NodePath<t.AssignmentExpression>
      ) {
        const left = path.node.left;
        const right = path.node.right;
        if (
          t.isMemberExpression(left) &&
          t.isIdentifier(left.object, { name: "module" }) &&
          t.isIdentifier(left.property, { name: "exports" }) &&
          t.isObjectExpression(right)
        ) {
          const themeVal = getObjectKey(right, "theme");
          if (themeVal && t.isObjectExpression(themeVal)) {
            themeNode = themeVal;
            const extVal = getObjectKey(themeVal, "extend");
            if (extVal && t.isObjectExpression(extVal)) {
              extendNode = extVal;
            }
          }
        }
      },
    });
  } catch {
    return merged;
  }

  // Extract from theme (non-extend) — replaces defaults for that key
  if (themeNode) {
    for (const key of THEME_KEYS) {
      if (key === "colors") continue; // handled specially
      const keyNode = getObjectKey(themeNode, key as string);
      if (keyNode && t.isObjectExpression(keyNode)) {
        const vals = flattenObject(keyNode, source);
        if (Object.keys(vals).length > 0) {
          mergedRec[key as string] = vals;
        }
      }
    }
    // Colors specially — preserve canonical names for `{ DEFAULT, … }` shapes.
    const colorsNode = getObjectKey(themeNode, "colors");
    if (colorsNode && t.isObjectExpression(colorsNode)) {
      merged.colors = flattenColors(colorsNode, source);
    }
  }

  // Extract from theme.extend — merges on top of defaults
  if (extendNode) {
    for (const key of THEME_KEYS) {
      const keyNode = getObjectKey(extendNode, key as string);
      if (keyNode && t.isObjectExpression(keyNode)) {
        const vals =
          key === "colors"
            ? flattenColors(keyNode, source)
            : flattenObject(keyNode, source);
        const existing = (mergedRec[key as string] as ThemeValueMap) ?? {};
        mergedRec[key as string] = { ...existing, ...vals };
      }
    }
  }

  merged._source = filePath;
  return merged;
}
