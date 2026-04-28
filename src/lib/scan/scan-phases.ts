/**
 * Canonical scan phases emitted into brand_scan_logs.payload.phase (see run-repo-scan).
 * Order matches the sequential checklist shown during onboarding.
 */

export const SCAN_PHASE_ORDER = [
  "fetch_meta",
  "fetch_tree",
  "fetch_css",
  "fetch_layouts",
  "fetch_assets",
  "build_profile",
  "upload_assets",
  "save",
  "done",
] as const;

export type ScanPhase = (typeof SCAN_PHASE_ORDER)[number];

export const SCAN_PHASE_LABELS: Record<ScanPhase, string> = {
  fetch_meta: "Repository metadata",
  fetch_tree: "File tree",
  fetch_css: "Stylesheets",
  fetch_layouts: "Layouts & pages",
  fetch_assets: "Raster & SVG assets",
  build_profile: "Build brand profile",
  upload_assets: "Upload assets to storage",
  save: "Save to your workspace",
  done: "Complete",
};

/** Index in SCAN_PHASE_ORDER, or -1 if unknown. */
export function scanPhaseIndex(phase: string | null | undefined): number {
  if (!phase) return -1;
  const i = SCAN_PHASE_ORDER.indexOf(phase as ScanPhase);
  return i;
}

export function isTerminalScanPhase(phase: string | null | undefined): boolean {
  return phase === "done";
}
