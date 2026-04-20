/**
 * shadcn-config.ts — components.json resolver.
 * PDF §10 — source 3: shadcn/ui.
 *
 * Given the raw JSON string of components.json, resolves the CSS file path
 * so the caller can read it and feed it through css-vars.ts.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShadcnConfigResult {
  /** Resolved path to the CSS file referenced by components.json */
  cssPath: string | null;
  /** The aliased tailwind config path, if specified */
  tailwindConfigPath: string | null;
  /** Base color (e.g. "slate", "zinc") */
  baseColor: string | null;
  /** CSS variables mode */
  cssVariables: boolean;
  /** Style (e.g. "default", "new-york") */
  style: string | null;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a components.json string and extract the CSS path and metadata.
 * Permissive — returns nulls on failure.
 */
export function parseShadcnConfig(jsonSource: string): ShadcnConfigResult {
  const result: ShadcnConfigResult = {
    cssPath: null,
    tailwindConfigPath: null,
    baseColor: null,
    cssVariables: true,
    style: null,
  };

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonSource) as Record<string, unknown>;
  } catch {
    return result;
  }

  result.style = typeof parsed.style === "string" ? parsed.style : null;
  result.baseColor =
    typeof parsed.baseColor === "string" ? parsed.baseColor : null;
  result.cssVariables = parsed.cssVariables !== false;

  // Resolve CSS path
  // components.json typically has: { "tailwind": { "css": "app/globals.css" } }
  // or at root: { "globalCss": "app/globals.css" }
  const tw = parsed.tailwind as Record<string, unknown> | undefined;
  if (tw && typeof tw.css === "string") {
    result.cssPath = normalizePath(tw.css);
  } else if (typeof parsed.globalCss === "string") {
    result.cssPath = normalizePath(parsed.globalCss as string);
  }

  // Tailwind config path
  if (tw && typeof tw.config === "string") {
    result.tailwindConfigPath = tw.config;
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePath(cssPath: string): string {
  // Normalise leading "./" and ensure it starts from project root
  return cssPath.replace(/^\.\//, "");
}
