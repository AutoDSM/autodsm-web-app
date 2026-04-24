"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { CATEGORY_LABELS } from "@/lib/brand/types";
import { useDashboardAppBasePath } from "@/components/shell/dashboard-app-context";

/** Current dashboard tab title only (no repo slug in the chrome). */
function sectionTitleFromPath(pathname: string, appBasePath: string): string {
  const baseSeg = appBasePath.split("/").filter(Boolean)[0] ?? "dashboard";
  const segments = pathname.split("/").filter(Boolean);
  const lastSeg = segments[segments.length - 1] ?? "";

  if (segments[0] !== baseSeg) {
    return "Dashboard";
  }
  if (segments.length === 1) {
    return "Dashboard";
  }
  if (segments[1] === "agent") {
    return "New agent";
  }
  if (lastSeg === "settings") {
    return "Settings";
  }
  return CATEGORY_LABELS[lastSeg] ?? lastSeg;
}

export function TopBar() {
  const pathname = usePathname();
  const appBasePath = useDashboardAppBasePath();
  const title = sectionTitleFromPath(pathname, appBasePath);

  /** Agent uses a minimal hero + composer; repo title row would duplicate the shell chrome. */
  if (pathname === `${appBasePath}/agent`) {
    return null;
  }

  /** Overview already has a page hero; hide the redundant “Dashboard” section title row. */
  const normalizedBase = appBasePath.replace(/\/$/, "") || "/dashboard";
  if (pathname === normalizedBase || pathname === `${normalizedBase}/`) {
    return null;
  }

  return (
    <div
      className={[
          "flex h-fit w-full shrink-0 items-center justify-between bg-[var(--bg-elevated)] px-4 py-3",
          "border-b border-transparent dark:border-[var(--border-subtle)]",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center">
        <span className="truncate text-body-s font-medium text-[var(--text-primary)]">{title}</span>
      </div>
    </div>
  );
}
