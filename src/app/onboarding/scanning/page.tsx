"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductIcon } from "@/components/brand/product-mark";
import { ScanPhaseList } from "@/components/onboarding/scan-phase-list";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isPreviewOnboardingEnabled, setPreviewOnboarding } from "@/lib/onboarding/storage";
import { createClient } from "@/lib/supabase/client";
import { SCAN_PHASE_ORDER, scanPhaseIndex } from "@/lib/scan/scan-phases";
import { AlertCircle, AlertTriangle } from "lucide-react";

const PREVIEW_STEPS = [
  "Fetching repository…",
  "Detecting framework…",
  "Parsing CSS variables…",
  "Parsing Tailwind config…",
  "Extracting 12 token categories…",
  "Scanning assets…",
  "Done. Redirecting…",
];

const STALENESS_MS = 90_000;
const MAX_WAIT_MS = 5 * 60_000;

type ScanStatusPayload = {
  repoId?: string | null;
  phase?: string | null;
  scanStatus?: string | null;
  lastScanError?: string | null;
  counts?: Record<string, number> | null;
  /** Present when GET /api/scan/status returns an error payload (even at 200 in edge cases). */
  error?: string;
  message?: string;
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
  /** GET /api/scan/status failures (HTTP or JSON error) — shown in a destructive alert for debugging. */
  const [statusPollError, setStatusPollError] = React.useState<string | null>(null);
  /** Server-side last_scan_error from status poll while scan may still be running or after failure. */
  const [lastScanErrorHint, setLastScanErrorHint] = React.useState<string | null>(null);
  /** True when the scan hasn't advanced phase in STALENESS_MS or wall-clock has hit MAX_WAIT_MS. */
  const [isStalled, setIsStalled] = React.useState(false);

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
    const pollStartedAt = Date.now();
    let lastPhaseChangeAt = Date.now();
    let lastPhaseSeen: string | null = null;

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
        const text = await res.text();
        let body: ScanStatusPayload & Record<string, unknown> = {};
        try {
          body = text ? (JSON.parse(text) as ScanStatusPayload & Record<string, unknown>) : {};
        } catch {
          body = {};
        }

        if (!res.ok) {
          const detail =
            typeof body.message === "string"
              ? body.message
              : typeof body.error === "string"
                ? body.error
                : text.slice(0, 1200);
          const line = `GET /api/scan/status → HTTP ${res.status}${detail ? ` · ${detail}` : ""}`;
          setStatusPollError(line);
          console.error("[onboarding/scanning]", line, body);
          return;
        }

        if (typeof body.error === "string") {
          const line = `${body.error}${typeof body.message === "string" ? `: ${body.message}` : ""}`;
          setStatusPollError(line);
          console.error("[onboarding/scanning] scan/status body error", body);
        } else {
          setStatusPollError(null);
        }

        if (body.phase != null) {
          setScanPhase(body.phase);
          if (body.phase !== lastPhaseSeen) {
            lastPhaseSeen = body.phase;
            lastPhaseChangeAt = Date.now();
            setIsStalled(false);
          }
        }
        if (body.scanStatus != null) setScanStatus(body.scanStatus);
        if (body.counts) setTokenCounts(body.counts);
        if (body.repoId) setRepoId(body.repoId);
        const lse = body.lastScanError;
        setLastScanErrorHint(typeof lse === "string" && lse.trim() ? lse : null);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        const msg = (e as Error).message ?? String(e);
        setStatusPollError(`GET /api/scan/status · ${msg}`);
        console.error("[onboarding/scanning] status poll exception", e);
      }
    };

    void pollStatus();
    const poll = window.setInterval(() => void pollStatus(), 1500);
    const stallCheck = window.setInterval(() => {
      const since = Date.now() - lastPhaseChangeAt;
      const total = Date.now() - pollStartedAt;
      if (since > STALENESS_MS || total > MAX_WAIT_MS) {
        setIsStalled(true);
        if (total > MAX_WAIT_MS) {
          window.clearInterval(poll);
          window.clearInterval(stallCheck);
        }
      }
    }, 5_000);

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
          const detail =
            typeof body.error === "string"
              ? body.error
              : typeof body.message === "string"
                ? body.message
                : "";
          const line = `POST /api/scan → HTTP ${res.status}${detail ? ` · ${detail}` : ""}`;
          setError(line);
          setStatusPollError(null);
          console.error("[onboarding/scanning]", line, body);
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
          const msg = body.error ?? "Unknown scan status";
          setError(typeof msg === "string" ? msg : "Unknown scan status");
          setStatusPollError(null);
          console.error("[onboarding/scanning] unexpected scan response", body);
          setScanStatus("failed");
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          const msg = (e as Error).message;
          setError(`POST /api/scan · ${msg}`);
          setStatusPollError(null);
          console.error("[onboarding/scanning] scan request exception", e);
        }
      }
    })();

    return () => {
      controller.abort();
      window.clearInterval(poll);
      window.clearInterval(stallCheck);
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
    scanStatus === "failed" && !error
      ? "Scan didn’t finish. Check details below or edit your repository."
      : null;

  /** Early phases: show errors inline under “File tree” so they sit with repository scanning (easier debugging). */
  const isRepoScanStage =
    !isPreview &&
    (scanPhase === null ||
      scanPhase === "fetch_meta" ||
      scanPhase === "fetch_tree");

  const repoStageError =
    isRepoScanStage
      ? statusPollError ??
        error ??
        lastScanErrorHint ??
        (scanStatus === "failed" ? statusError : null)
      : null;

  const showStatusPollAlert = !isPreview && statusPollError && !isRepoScanStage;
  const showLastScanHint =
    !isPreview &&
    lastScanErrorHint &&
    (scanStatus === "failed" || scanStatus === "scanning") &&
    !isRepoScanStage;
  const showStalled =
    !isPreview &&
    isStalled &&
    scanStatus !== "completed" &&
    scanStatus !== "failed" &&
    !error;

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

        {showStatusPollAlert ? (
          <Alert variant="destructive" className="mt-5 border-[color-mix(in_srgb,var(--error)_45%,transparent)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)] text-[var(--error)] [&_[data-slot=alert-description]]:text-[var(--error)]/95">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            <AlertTitle>Scan status request failed</AlertTitle>
            <AlertDescription className="break-words font-[var(--font-geist-mono)] text-[12px] leading-relaxed">
              {statusPollError}
            </AlertDescription>
          </Alert>
        ) : null}

        {showLastScanHint ? (
          <Alert className="mt-5 border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--text-primary)]">
            <AlertTriangle className="size-4 shrink-0 text-[var(--warning)]" aria-hidden />
            <AlertTitle>Last scan message</AlertTitle>
            <AlertDescription className="break-words font-[var(--font-geist-mono)] text-[12px] leading-relaxed text-[var(--text-secondary)]">
              {lastScanErrorHint}
            </AlertDescription>
          </Alert>
        ) : null}

        {showStalled ? (
          <Alert className="mt-5 border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--text-primary)]">
            <AlertTriangle className="size-4 shrink-0 text-[var(--warning)]" aria-hidden />
            <AlertTitle>Scan looks stuck</AlertTitle>
            <AlertDescription className="break-words text-[13px] leading-relaxed text-[var(--text-secondary)]">
              We haven&apos;t seen progress in a while. The repo may be very large or
              GitHub may be slow. You can keep waiting or restart from the connect step.
              <span className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href="/onboarding/connect">Restart scan</Link>
                </Button>
              </span>
            </AlertDescription>
          </Alert>
        ) : null}

        <ScanPhaseList
          className="mt-6"
          currentPhase={isPreview ? null : scanPhase}
          scanStatus={isPreview ? null : scanStatus}
          previewStepIndex={isPreview ? previewLog.length : undefined}
          previewTotalSteps={isPreview ? PREVIEW_STEPS.length : undefined}
          tokenCounts={isPreview ? null : tokenCounts}
          repoStageError={repoStageError}
        />

        <p className="mt-5 min-h-[1.25em] font-[var(--font-geist-mono)] text-[13px] text-[var(--text-primary)]">
          {error || statusError ? null : isPreview ? previewLog[previewLog.length - 1] ?? "Starting preview…" : null}
        </p>

        {error || statusError ? (
          <div className="mt-6 space-y-3">
            {!(isRepoScanStage && repoStageError) ? (
              <Alert variant="destructive" className="border-[color-mix(in_srgb,var(--error)_45%,transparent)] bg-[color-mix(in_srgb,var(--error)_12%,transparent)] text-[var(--error)] [&_[data-slot=alert-description]]:text-[var(--error)]/95">
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                <AlertTitle>Scan failed</AlertTitle>
                <AlertDescription className="break-words font-[var(--font-geist-mono)] text-[12px] leading-relaxed">
                  {error ?? statusError}
                </AlertDescription>
              </Alert>
            ) : null}
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
