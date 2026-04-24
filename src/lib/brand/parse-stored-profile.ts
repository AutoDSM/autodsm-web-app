import "server-only";
import { z } from "zod";
import type { BrandProfile } from "./types";

// We validate the high-level shape — every category must be an array of
// objects (so the dashboard can iterate without crashing) and `meta` must
// exist. Inner fields aren't strictly typed because the BrandProfile evolves
// frequently; missing optional fields are tolerated and the rescan banner
// will pick up older shapes via `EXTRACTOR_VERSION`.
const profileShape = z.object({
  repo: z
    .object({
      owner: z.string(),
      name: z.string(),
      branch: z.string().optional().default("main"),
      url: z.string().optional().default(""),
    })
    .passthrough(),
  scannedAt: z.string().optional().default(""),
  scannedFromSha: z.string().optional().default(""),
  colors: z.array(z.record(z.unknown())).default([]),
  typography: z.array(z.record(z.unknown())).default([]),
  fonts: z.array(z.record(z.unknown())).default([]),
  spacing: z.array(z.record(z.unknown())).default([]),
  shadows: z.array(z.record(z.unknown())).default([]),
  radii: z.array(z.record(z.unknown())).default([]),
  borders: z.array(z.record(z.unknown())).default([]),
  animations: z.array(z.record(z.unknown())).default([]),
  breakpoints: z.array(z.record(z.unknown())).default([]),
  opacity: z.array(z.record(z.unknown())).default([]),
  zIndex: z.array(z.record(z.unknown())).default([]),
  gradients: z.array(z.record(z.unknown())).default([]),
  assets: z.array(z.record(z.unknown())).default([]),
  meta: z
    .object({
      filesScanned: z.number().optional().default(0),
      cssSource: z.string().optional().default(""),
      tailwindConfigPath: z.string().nullable().optional().default(null),
      shadcnConfigPath: z.string().nullable().optional().default(null),
      tailwindVersion: z
        .union([z.literal("3"), z.literal("4"), z.null()])
        .optional()
        .default(null),
    })
    .passthrough(),
});

/**
 * Validate a stored `brand_profile` JSONB blob. Returns `null` on shape drift
 * so callers can render the rescan banner instead of crashing client-side.
 */
export function parseStoredProfile(json: unknown): BrandProfile | null {
  if (!json || typeof json !== "object") return null;
  const result = profileShape.safeParse(json);
  if (!result.success) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[brand] stored profile failed to validate", result.error.flatten());
    }
    return null;
  }
  return result.data as unknown as BrandProfile;
}
