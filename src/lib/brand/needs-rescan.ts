import { EXTRACTOR_VERSION } from "@/lib/extract/extractor-version";
import type { BrandProfile } from "./types";

/** True when the stored profile was built with an older extractor and should be re-scanned. */
export function needsRescan(profile: BrandProfile | null | undefined): boolean {
  if (!profile) return false;
  const v = profile.meta?.extractorVersion;
  if (v == null) return true;
  return v < EXTRACTOR_VERSION;
}
