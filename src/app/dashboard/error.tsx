"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error to the console for debugging
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-[var(--error)]/10">
        <AlertTriangle className="size-8 text-[var(--error)]" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Something went wrong
        </h1>
        <p className="max-w-md text-sm text-[var(--text-secondary)]">
          An unexpected error occurred while loading this page. This has been
          logged and we&apos;ll look into it.
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--text-tertiary)]">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={reset}>
          <RefreshCw className="mr-2 size-4" aria-hidden />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <a href="/dashboard">Go to dashboard</a>
        </Button>
      </div>
    </div>
  );
}
