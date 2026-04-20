"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Github } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { useBrandStore } from "@/stores/brand";
import { CATEGORY_LABELS } from "@/lib/brand/types";

/** Current dashboard tab title only (no repo slug in the chrome). */
function sectionTitleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const lastSeg = segments[segments.length - 1] ?? "";

  if (segments[0] !== "dashboard") {
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
  const profile = useBrandStore((s) => s.profile);
  const title = sectionTitleFromPath(pathname);

  /** Agent uses a minimal hero + composer; repo title row would duplicate the shell chrome. */
  if (pathname === "/dashboard/agent") {
    return null;
  }

  return (
    <div className="flex items-center justify-between h-14 px-6 border-b border-[var(--border-subtle)] shrink-0">
      <div className="flex min-w-0 items-center">
        <span className="truncate text-body-s font-medium text-[var(--text-primary)]">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        {profile?.repo?.url ? (
          <Link
            href={profile.repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <Github size={14} strokeWidth={1.5} />
            <span>View on GitHub</span>
          </Link>
        ) : null}
        <ThemeToggle />
      </div>
    </div>
  );
}
