import "server-only";
import type { BrandProfile } from "@/lib/brand/types";

export type ProfileValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

const REQUIRED_ARRAY_KEYS = [
  "colors",
  "typography",
  "fonts",
  "spacing",
  "shadows",
  "radii",
  "borders",
  "animations",
  "breakpoints",
  "opacity",
  "zIndex",
  "gradients",
  "assets",
] as const satisfies ReadonlyArray<keyof BrandProfile>;

/**
 * Pre-save sanity check on the extracted brand profile. Catches malformed
 * extractor output (NaN sizes, missing categories, dropped meta) before we
 * persist garbage to brand_repos.
 */
export function validateBrandProfile(profile: unknown): ProfileValidationResult {
  if (!profile || typeof profile !== "object") {
    return { ok: false, reason: "Profile is not an object." };
  }

  const p = profile as Record<string, unknown>;

  for (const key of REQUIRED_ARRAY_KEYS) {
    if (!Array.isArray(p[key])) {
      return { ok: false, reason: `Profile is missing array category "${key}".` };
    }
  }

  if (!p.meta || typeof p.meta !== "object") {
    return { ok: false, reason: "Profile is missing meta block." };
  }

  const typography = p.typography as Array<{ fontSizePx?: unknown }>;
  for (const t of typography) {
    if (typeof t.fontSizePx === "number" && !Number.isFinite(t.fontSizePx)) {
      return { ok: false, reason: "Typography contains non-finite fontSizePx." };
    }
  }

  const breakpoints = p.breakpoints as Array<{ px?: unknown }>;
  for (const b of breakpoints) {
    if (typeof b.px === "number" && !Number.isFinite(b.px)) {
      return { ok: false, reason: "Breakpoints contain non-finite px value." };
    }
  }

  const opacity = p.opacity as Array<{ value?: unknown }>;
  for (const o of opacity) {
    if (typeof o.value === "number" && !Number.isFinite(o.value)) {
      return { ok: false, reason: "Opacity contains non-finite value." };
    }
  }

  const zIndex = p.zIndex as Array<{ value?: unknown }>;
  for (const z of zIndex) {
    if (typeof z.value === "number" && !Number.isFinite(z.value)) {
      return { ok: false, reason: "Z-index contains non-finite value." };
    }
  }

  return { ok: true };
}
