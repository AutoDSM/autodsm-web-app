import * as React from "react";
import { PageTypeIconFrame } from "@/components/ui/page-type-icon-frame";
import { dashboardMainContentClassName } from "@/lib/dashboard-content-layout";
import { timeAgo } from "@/lib/format-time";
import { cn } from "@/lib/utils";

/** Set to `true` to show `metaRight` (e.g. Last updated) in the top row again. */
const SHOW_TOKEN_PAGE_META_RIGHT = false;

export function LastUpdatedLabel({ scannedAt }: { scannedAt: string }) {
  const label = timeAgo(scannedAt);
  return (
    <p
      className="flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)] lg:justify-end"
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
        aria-hidden
      />
      <span style={{ fontFamily: "var(--font-geist-sans)" }}>Last updated: {label}</span>
    </p>
  );
}

export interface BrandTokenPageHeroProps {
  title: string;
  description: React.ReactNode;
  /** Placed inside `PageTypeIconFrame` (e.g. a Lucide icon). */
  icon: React.ReactNode;
  className?: string;
}

export function BrandTokenPageHero({ title, description, icon, className }: BrandTokenPageHeroProps) {
  return (
    <div className={cn("flex flex-col items-start gap-4", className)}>
      <PageTypeIconFrame>{icon}</PageTypeIconFrame>
      <div className="min-w-0">
        <h1 className="text-h1 text-[var(--text-primary)]">{title}</h1>
        {typeof description === "string" ? (
          <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        ) : (
          description
        )}
      </div>
    </div>
  );
}

export interface BrandTokenPageLayoutProps {
  /** Hero block (use `BrandTokenPageHero`). */
  hero: React.ReactNode;
  /** Main content under the hero (e.g. tabs + lists). */
  children: React.ReactNode;
  /** Right column (e.g. `LastUpdatedLabel` or a stack with controls + label). */
  metaRight?: React.ReactNode;
  /** Full-width block below the top row. */
  footer?: React.ReactNode;
  /** Defaults to the shared dashboard content width. */
  className?: string;
}

/**
 * Two-column top row: left = hero + stacked `children`, right = optional metadata.
 * Optional `footer` spans the content width (same padding as dashboard token pages).
 */
export function BrandTokenPageLayout({
  hero,
  children,
  metaRight,
  footer,
  className,
}: BrandTokenPageLayoutProps) {
  return (
    <div className={cn(dashboardMainContentClassName, className)}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-5">
          {hero}
          {children}
        </div>
        {SHOW_TOKEN_PAGE_META_RIGHT && metaRight != null ? (
          <div className="shrink-0 lg:pt-1">{metaRight}</div>
        ) : null}
      </div>
      {footer}
    </div>
  );
}
