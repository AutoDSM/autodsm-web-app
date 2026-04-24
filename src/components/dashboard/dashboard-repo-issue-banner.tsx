"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describeRepoLoadIssue } from "@/lib/brand/repo-load-issue";
import { useDashboardAppBasePath } from "@/components/shell/dashboard-app-context";
import { createClient } from "@/lib/supabase/client";

export function DashboardRepoIssueBanner({
  repoSlug,
  status,
  reasonCode,
  lastScanError,
}: {
  repoSlug: string;
  status: "unsupported" | "failed";
  reasonCode: string | null;
  lastScanError: string | null;
}) {
  const appBase = useDashboardAppBasePath();
  const settingsHref = `${appBase}/settings`;
  const { title, description } = describeRepoLoadIssue({
    status,
    repoSlug,
    reasonCode,
    lastScanError,
  });

  const [showDetails, setShowDetails] = React.useState(false);
  const [latestLog, setLatestLog] = React.useState<
    | null
    | {
        event: string | null;
        payload: Record<string, unknown> | null;
        createdAt: string | null;
      }
  >(null);

  React.useEffect(() => {
    if (!showDetails || latestLog) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("brand_scan_logs")
          .select("event,payload,created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setLatestLog({
            event: (data.event as string | null) ?? null,
            payload:
              (data.payload as Record<string, unknown> | null) ?? null,
            createdAt: (data.created_at as string | null) ?? null,
          });
        } else {
          setLatestLog({ event: null, payload: null, createdAt: null });
        }
      } catch {
        if (!cancelled) setLatestLog({ event: null, payload: null, createdAt: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showDetails, latestLog]);

  return (
    <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-3 sm:px-4">
      <Alert
        variant="destructive"
        className="border-[var(--error)]/35 bg-[color-mix(in_srgb,var(--error)_8%,var(--bg-elevated))] text-[var(--text-primary)] [&_[data-slot=alert-description]]:text-[var(--text-secondary)]"
      >
        <AlertTriangle className="size-4 text-[var(--error)]" aria-hidden />
        <AlertTitle className="text-[var(--text-primary)]">{title}</AlertTitle>
        <AlertDescription className="mt-1 text-[13px] leading-relaxed">
          {description}{" "}
          <span className="text-[var(--text-tertiary)]">
            Change the repository or try another scan from Settings — you stay signed in.
          </span>
        </AlertDescription>
        <div className="col-start-2 mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={settingsHref}>Open Settings</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`${appBase}`}>Dashboard home</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
          >
            {showDetails ? "Hide technical details" : "Show technical details"}
          </Button>
        </div>
        {showDetails ? (
          <div className="col-start-2 mt-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-[12px] leading-relaxed text-[var(--text-tertiary)]">
            <div className="font-medium text-[var(--text-secondary)]">
              Latest scan event
            </div>
            {latestLog === null ? (
              <div className="mt-1">Loading…</div>
            ) : latestLog.event === null ? (
              <div className="mt-1">No scan logs found yet.</div>
            ) : (
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11.5px]">
                {[
                  `event: ${latestLog.event}`,
                  latestLog.createdAt ? `at: ${latestLog.createdAt}` : "",
                  latestLog.payload
                    ? `payload: ${JSON.stringify(latestLog.payload, null, 2)}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n")}
              </pre>
            )}
          </div>
        ) : null}
      </Alert>
    </div>
  );
}
