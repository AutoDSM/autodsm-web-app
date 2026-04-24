"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describeRepoLoadIssue } from "@/lib/brand/repo-load-issue";
import { useDashboardAppBasePath } from "@/components/shell/dashboard-app-context";

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
        </div>
      </Alert>
    </div>
  );
}
