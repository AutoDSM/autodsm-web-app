import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  /** Main label, e.g. "Scale", "Applied examples". */
  children: React.ReactNode;
  /** Optional short helper under the title (single muted line). */
  description?: React.ReactNode;
  /** Optional right-side element (toggle, button). */
  action?: React.ReactNode;
  /** Render level for semantics. Defaults to h2. */
  as?: "h2" | "h3";
  /** Extra classes on the wrapper. */
  className?: string;
}

/**
 * Linear-style section heading for token pages — smaller + quieter than the
 * page hero `text-h1`. Mirrors the group-header style used in Colors and
 * Typography (tight label + optional secondary line), with room for a right
 * action chip.
 */
export function SectionHeading({
  children,
  description,
  action,
  as = "h2",
  className,
}: SectionHeadingProps) {
  const Tag = as;
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-3 border-b border-[var(--border-subtle)] pb-3 mb-4",
        className,
      )}
    >
      <div className="min-w-0">
        <Tag
          className="text-[15px] font-semibold leading-tight tracking-tight text-[var(--text-primary)]"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          {children}
        </Tag>
        {description ? (
          <p className="mt-1 text-[12px] leading-snug text-[var(--text-tertiary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
