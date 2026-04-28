"use client";

import * as React from "react";
import {
  Check,
  Circle,
  Loader2,
  Palette,
  Type,
  Ruler,
  Layers,
  CircleDot,
  Square,
  MousePointer2,
  Monitor,
  Droplet,
  BringToFront,
  Sparkles,
  Image as ImageIcon,
  GitBranch,
  FolderTree,
  FileCode2,
  LayoutTemplate,
  Package,
  Cpu,
  CloudUpload,
  Save,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SCAN_PHASE_LABELS,
  SCAN_PHASE_ORDER,
  scanPhaseIndex,
  type ScanPhase,
} from "@/lib/scan/scan-phases";

const PHASE_ICONS: Record<ScanPhase, React.ComponentType<{ className?: string }>> = {
  fetch_meta: GitBranch,
  fetch_tree: FolderTree,
  fetch_css: FileCode2,
  fetch_layouts: LayoutTemplate,
  fetch_assets: Package,
  build_profile: Cpu,
  upload_assets: CloudUpload,
  save: Save,
  done: Flag,
};

const TOKEN_CATEGORIES: {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  countKey: keyof TokenCounts;
}[] = [
  { id: "colors", label: "Colors", Icon: Palette, countKey: "colors" },
  { id: "typography", label: "Typography", Icon: Type, countKey: "typography" },
  { id: "spacing", label: "Spacing", Icon: Ruler, countKey: "spacing" },
  { id: "shadows", label: "Shadows", Icon: Layers, countKey: "shadows" },
  { id: "radii", label: "Radii", Icon: CircleDot, countKey: "radii" },
  { id: "borders", label: "Borders", Icon: Square, countKey: "borders" },
  { id: "animations", label: "Animations", Icon: MousePointer2, countKey: "animations" },
  { id: "breakpoints", label: "Breakpoints", Icon: Monitor, countKey: "breakpoints" },
  { id: "opacity", label: "Opacity", Icon: Droplet, countKey: "opacity" },
  { id: "zindex", label: "Z-Index", Icon: BringToFront, countKey: "zIndex" },
  { id: "gradients", label: "Gradients", Icon: Sparkles, countKey: "gradients" },
  { id: "assets", label: "Assets", Icon: ImageIcon, countKey: "assets" },
];

type TokenCounts = Partial<Record<(typeof TOKEN_CATEGORIES)[number]["countKey"], number>>;

type RowState = "pending" | "active" | "complete" | "failed";

function phaseRowState(
  phase: ScanPhase,
  currentPhase: string | null,
  scanFailed: boolean,
): RowState {
  const cur = scanPhaseIndex(currentPhase);
  const mine = scanPhaseIndex(phase);
  if (scanFailed) {
    if (cur >= 0 && mine === cur) return "failed";
    if (cur < 0 && mine === 0) return "failed";
    if (cur >= 0 && mine < cur) return "complete";
    return "pending";
  }
  if (cur < 0) return phase === "fetch_meta" ? "active" : "pending";
  if (mine < cur) return "complete";
  if (mine === cur) return "active";
  return "pending";
}

export function ScanPhaseList({
  currentPhase,
  scanStatus,
  previewStepIndex,
  previewTotalSteps,
  tokenCounts,
  className,
}: {
  currentPhase: string | null;
  scanStatus: string | null;
  /** Preview mode: drive phases from a fake step index */
  previewStepIndex?: number;
  previewTotalSteps?: number;
  tokenCounts?: Record<string, number> | null;
  className?: string;
}) {
  const scanFailed = scanStatus === "failed";
  const showTokens =
    Boolean(tokenCounts && Object.keys(tokenCounts).length > 0) &&
    (scanPhaseIndex(currentPhase) >= scanPhaseIndex("build_profile") ||
      currentPhase === "done" ||
      scanStatus === "completed");

  const previewMode =
    typeof previewStepIndex === "number" &&
    typeof previewTotalSteps === "number" &&
    previewTotalSteps > 0;

  return (
    <div className={cn("w-full space-y-8", className)}>
      <div>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)] [font-family:var(--font-geist-mono)]">
          Scan progress
        </p>
        <ol className="space-y-0">
          {SCAN_PHASE_ORDER.map((phase, i) => {
            let state: RowState;
            if (previewMode) {
              const denom = Math.max((previewTotalSteps ?? 1) - 1, 1);
              const wave = Math.min(
                SCAN_PHASE_ORDER.length - 1,
                Math.round(((previewStepIndex ?? 0) / denom) * (SCAN_PHASE_ORDER.length - 1)),
              );
              state =
                i < wave ? "complete" : i === wave ? "active" : "pending";
            } else {
              state = phaseRowState(phase, currentPhase, scanFailed);
            }
            const Icon = PHASE_ICONS[phase];
            return (
              <li
                key={phase}
                className="flex gap-3 border-b border-[var(--border-subtle)] py-2.5 last:border-b-0"
              >
                <div className="mt-0.5 shrink-0">
                  {state === "complete" ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    </span>
                  ) : state === "failed" ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--error)_22%,transparent)] text-[var(--error)]">
                      <Circle className="h-3 w-3 fill-current" aria-hidden />
                    </span>
                  ) : state === "active" ? (
                    <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-[var(--purple-600)]/60 bg-[color-mix(in_srgb,var(--purple-600)_12%,var(--bg-elevated))] text-[var(--text-primary)]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      <span className="autodsm-scan-sheen pointer-events-none absolute inset-0 rounded-full" aria-hidden />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 text-[var(--text-tertiary)] opacity-60">
                      <Circle className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                    <span
                      className={cn(
                        "text-[13px] font-medium [font-family:var(--font-geist-sans)]",
                        state === "pending" && "text-[var(--text-tertiary)]",
                        state === "active" && "text-[var(--text-primary)]",
                        state === "complete" && "text-[var(--text-primary)]",
                        state === "failed" && "text-[var(--error)]",
                      )}
                    >
                      {SCAN_PHASE_LABELS[phase]}
                    </span>
                  </div>
                  {state === "active" && !previewMode ? (
                    <p className="mt-0.5 font-[var(--font-geist-mono)] text-[11px] text-[var(--text-tertiary)]">
                      Working…
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {showTokens ? (
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)] [font-family:var(--font-geist-mono)]">
            Tokens detected so far
          </p>
          <ul className="space-y-1.5" aria-label="Token categories extracted">
            {TOKEN_CATEGORIES.map((c) => {
              const n = tokenCounts?.[c.countKey];
              const Icon = c.Icon;
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 px-3 py-2 text-[12px]"
                >
                  <span className="flex min-w-0 items-center gap-2 text-[var(--text-secondary)]">
                    <Icon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                    <span className="truncate [font-family:var(--font-geist-sans)]">{c.label}</span>
                  </span>
                  <span className="shrink-0 font-[var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--text-tertiary)]">
                    {typeof n === "number" ? `${n} found` : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
