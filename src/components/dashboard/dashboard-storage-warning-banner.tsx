"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StorageWarning = "bucket-missing" | "bucket-private" | "upload-failed";

function describeStorageWarning(warning: StorageWarning): {
  title: string;
  description: string;
} {
  switch (warning) {
    case "bucket-missing":
      return {
        title: "Brand asset storage not configured",
        description:
          "Logo and image assets were detected but couldn't be uploaded. Design tokens were extracted successfully.",
      };
    case "bucket-private":
      return {
        title: "Asset storage bucket is private",
        description:
          "The storage bucket exists but isn't publicly accessible. Logo images may not render in the dashboard.",
      };
    case "upload-failed":
      return {
        title: "Asset uploads failed",
        description:
          "Logo and image assets couldn't be uploaded to storage. Design tokens were extracted successfully.",
      };
  }
}

export function DashboardStorageWarningBanner({
  warning,
}: {
  warning: StorageWarning;
}) {
  const { title, description } = describeStorageWarning(warning);

  return (
    <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-3 sm:px-4">
      <Alert className="border-[var(--warning)]/35 bg-[color-mix(in_srgb,var(--warning)_8%,var(--bg-elevated))] text-[var(--text-primary)] [&_[data-slot=alert-description]]:text-[var(--text-secondary)]">
        <AlertTriangle className="size-4 text-[var(--warning)]" aria-hidden />
        <AlertTitle className="text-[var(--text-primary)]">{title}</AlertTitle>
        <AlertDescription className="mt-1 text-[13px] leading-relaxed">
          {description}
        </AlertDescription>
      </Alert>
    </div>
  );
}
