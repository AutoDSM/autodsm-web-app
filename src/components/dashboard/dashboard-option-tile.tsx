"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardOptionTileAccentFill = {
  baseOpacity: number;
  hoverOpacity: number;
};

export function DashboardOptionTile({
  href,
  label,
  Icon,
  className,
  accentFill,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  className?: string;
  /** From `primaryAccentFillOpacity(pickProjectTintColor(profile))` on the overview. */
  accentFill: DashboardOptionTileAccentFill;
}) {
  const { baseOpacity, hoverOpacity } = accentFill;

  return (
    <Link
      href={href}
      className={cn(
        "group block w-full min-w-0 overflow-hidden rounded-2xl bg-[var(--bg-elevated)] outline-none",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]",
        "transition-[filter,transform] duration-150 [transition-timing-function:var(--ease-standard)]",
        "hover:brightness-[1.01] active:scale-[0.995]",
        className,
      )}
      style={
        {
          "--dashboard-tile-accent-fill": String(baseOpacity),
          "--dashboard-tile-accent-fill-hover": String(hoverOpacity),
        } as CSSProperties
      }
      aria-label={`${label} tokens`}
    >
      {/*
        Reference: `Token-Card-Small.svg` — top stage + label. Golden-ratio stage (ϕ:1).
        Accent wash opacity comes from `primaryAccentFillOpacity` (see lib).
      */}
      <div
        className={cn(
          "relative w-full overflow-hidden [aspect-ratio:1.618/1] rounded-2xl",
          "flex items-center justify-center bg-[var(--bg-elevated)]",
          "text-[var(--accent)]",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-0 rounded-2xl bg-[var(--accent)]",
            "opacity-[var(--dashboard-tile-accent-fill)] transition-opacity duration-200 [transition-timing-function:var(--ease-standard)]",
            "group-hover:opacity-[var(--dashboard-tile-accent-fill-hover)]",
          )}
          aria-hidden
        />
        <Icon
          className={cn(
            "relative z-10 shrink-0 [stroke:currentColor]",
            "min-h-6 min-w-6",
            "h-[clamp(1.5rem,0.875rem+3vw,2rem)] w-[clamp(1.5rem,0.875rem+3vw,2rem)]",
            "min-[601px]:h-[clamp(1.5rem,0.4rem+2.2vw,2rem)] min-[601px]:w-[clamp(1.5rem,0.4rem+2.2vw,2rem)]",
          )}
          strokeWidth={2.2}
          aria-hidden
        />
      </div>
      <p
        className="px-3 py-2 text-center text-[13px] font-medium text-[var(--text-primary)] sm:text-[14px]"
        style={{ fontFamily: "var(--font-geist-sans)" }}
        aria-hidden
      >
        {label}
      </p>
    </Link>
  );
}
