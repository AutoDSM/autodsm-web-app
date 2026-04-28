"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductIcon } from "@/components/brand/product-mark";
import { ScanPhaseList } from "@/components/onboarding/scan-phase-list";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isPreviewOnboardingEnabled, setPreviewOnboarding } from "@/lib/onboarding/storage";
import { createClient } from "@/lib/supabase/client";
import { SCAN_PHASE_ORDER, scanPhaseIndex } from "@/lib/scan/scan-phases";

const PREVIEW_STEPS = [
  "Fetching repository…",
  "Detecting framework…",
  "Parsing CSS variables…",
  "Parsing Tailwind config…",
  "Extracting 12 token categories…",
  "Scanning assets…",
  "Done. Redirecting…",
];

type ScanStatusPayload = {
  repoId?: string | null;
  phase?: string | null;
  scanStatus?: string | null;
  lastScanError?: string | null;
  counts?: Record<string, number> | null;
};

function ScanningPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { isPreview: ctxPreview } = useOnboarding();
  const repo = params.get("repo");
  const projectName = params.get("projectName");
  const previewInUrl = params.get("preview") === "1";
  const isPreview = previewInUrl || isPreviewOnboardingEnabled() || ctxPreview;

  const [previewLog, setPreviewLog] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [scanPhase, setScanPhase] = React.useState<string | null>(null);
  const [scanStatus, setScanStatus] = React.useState<string | null>(null);
  const [tokenCounts, setTokenCounts] = React.useState<Record<string, number> | null>(null);
  const [repoId, setRepoId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!repo) {
      router.replace("/onboarding/connect");
      return;
    }

    if (isPreview) {
      if (typeof window !== "undefined") {
        setPreviewOnboarding(true);
      }
      let i = 0;
      const tick = setInterval(() => {
        if (i >= PREVIEW_STEPS.length) {
          clearInterval(tick);
          router.replace(
            `/onboarding/complete?preview=1&repo=${encodeURIComponent(repo)}`,
          );
          return;
        }
        setPreviewLog((l) => [...l, PREVIEW_STEPS[i]]);
        i++;
      }, 700);
      return () => clearInterval(tick);
    }

    const controller = new AbortController();

    void fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lastScanStarted: true,
        clearLastScanError: true,
        currentStep: "scanning",
      }),
    });

    const pollStatus = async () => {
      try {
        const res = await fetch("/api/scan/status", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as ScanStatusPayload;
        if (body.phase != null) setScanPhase(body.phase);
        if (body.scanStatus != null) setScanStatus(body.scanStatus);
        if (body.counts) setTokenCounts(body.counts);
        if (body.repoId) setRepoId(body.repoId);
      } catch {
        /* aborted */
      }
    };

    void pollStatus();
    const poll = window.setInterval(() => void pollStatus(), 1500);

    (async () => {
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repo, projectName }),
          signal: controller.signal,
        });
        await pollStatus();
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.unsupported) {
            router.replace(
              `/onboarding/unsupported?repo=${encodeURIComponent(repo)}&reason=${encodeURIComponent(body.unsupported)}`,
            );
            return;
          }
          setError(body.error ?? `Scan failed (${res.status})`);
          setScanStatus("failed");
          return;
        }
        const body = await res.json();
        await pollStatus();
        if (body.status === "completed") {
          await router.refresh();
          router.replace("/onboarding/review");
        } else if (body.unsupported) {
          router.replace(
            `/onboarding/unsupported?repo=${encodeURIComponent(repo)}&reason=${encodeURIComponent(body.unsupported)}`,
          );
        } else {
          setError(body.error ?? "Unknown scan status");
          setScanStatus("failed");
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
        }
      }
    })();

    return () => {
      controller.abort();
      window.clearInterval(poll);
    };
  }, [repo, router, isPreview, projectName]);

  React.useEffect(() => {
    if (!repoId || isPreview) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`brand_repo_scan_${repoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "brand_repos",
          filter: `id=eq.${repoId}`,
        },
        (payload) => {
          const row = payload.new as { scan_status?: string | null };
          if (row?.scan_status) setScanStatus(row.scan_status);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [repoId, isPreview]);

  const phaseProgress = React.useMemo(() => {
    const idx = scanPhaseIndex(scanPhase);
    if (idx < 0) return 5;
    return Math.min(100, Math.round(((idx + 1) / SCAN_PHASE_ORDER.length) * 100));
  }, [scanPhase]);

  const statusError =
    scanStatus === "failed"
      ? "Scan didn’t finish. Check details below or edit your repository."
      : null;

  return (
    <div className="grid min-h-0 min-w-0 flex-1 place-items-center bg-[var(--bg-primary)] px-4 py-8 sm:px-6">
      <div className="w-full min-w-0 max-w-2xl rounded-2xl border-0 bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-md)] sm:p-8 md:p-10">
        <ProductIcon size={32} className="autodsm-pulse" />
        <h2 className="mt-6 text-h2 text-[var(--text-primary)] break-all">{repo ?? "—"}</h2>
        <p className="mt-2 text-body-s text-[var(--text-secondary)]">
          {isPreview
            ? "Simulating your brand book load (preview)…"
            : "Building your brand book."}
        </p>

        <ScanPhaseList
          className="mt-6"
          currentPhase={isPreview ? null : scanPhase}
          scanStatus={isPreview ? null : scanStatus}
          previewStepIndex={isPreview ? previewLog.length : undefined}
          previewTotalSteps={isPreview ? PREVIEW_STEPS.length : undefined}
          tokenCounts={isPreview ? null : tokenCounts}
        />

        <p className="mt-5 min-h-[1.25em] font-[var(--font-geist-mono)] text-[13px] text-[var(--text-primary)]">
          {error || statusError ? null : isPreview ? previewLog[previewLog.length - 1] ?? "Starting preview…" : null}
        </p>

        {error || statusError ? (
          <div className="mt-6 space-y-3">
            <div className="rounded-lg border-0 bg-[color-mix(in_srgb,var(--error)_12%,transparent)] p-3 text-[13px] text-[var(--error)] shadow-[var(--shadow-sm)]">
              {error ?? statusError}
            </div>
            <Button asChild variant="outline" className="w-full h-10 rounded-xl">
              <Link href="/onboarding/connect">Edit repository</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            <Progress
              value={isPreview ? Math.min(100, Math.round((previewLog.length / PREVIEW_STEPS.length) * 100)) : phaseProgress}
              className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]"
            />
            <p className="text-[11px] text-[var(--text-tertiary)]">
              {isPreview
                ? `Step ${Math.min(previewLog.length, PREVIEW_STEPS.length)} of ${PREVIEW_STEPS.length}`
                : scanPhase
                  ? `Phase ${scanPhaseIndex(scanPhase) + 1} of ${SCAN_PHASE_ORDER.length}`
                  : "Connecting…"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanningPage() {
  return (
    <React.Suspense fallback={null}>
      <ScanningPageInner />
    </React.Suspense>
  );
}
