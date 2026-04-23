"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardOptionTile({
  href,
  label,
  Icon,
  className,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-2xl",
        "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {/*
        Reference: `Token-Card-Small.svg` (124x108) — a wide hero area (124x80) + label row.
        The hero uses a true golden ratio for its horizontal layout (ϕ:1) while keeping the
        “tinted stage + icon + label” structure from the reference asset.
        Interaction target is ONLY the top hero, matching the spec.
      */}
      <Link
        href={href}
        className={cn(
          "group block w-full outline-none",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]",
        )}
        aria-label={`${label} tokens`}
      >
        <div
          className={cn(
            "relative w-full [aspect-ratio:1.618/1]",
            "flex items-center justify-center",
            "bg-[color-mix(in_srgb,var(--accent)_8%,var(--bg-elevated))]",
            "transition-[filter,transform] duration-150 [transition-timing-function:var(--ease-standard)]",
            "group-hover:brightness-[1.01] group-active:scale-[0.995]",
            "text-[var(--accent)]",
          )}
        >
          <Icon
            className="h-9 w-9 sm:h-10 sm:w-10 [stroke:currentColor]"
            strokeWidth={1.7}
            aria-hidden
          />
        </div>
      </Link>

      <p
        className="px-3 py-2 text-center text-[13px] font-medium text-[var(--text-primary)] sm:text-[14px]"
        style={{ fontFamily: "var(--font-geist-sans)" }}
        aria-hidden="true"
      >
        {label}
      </p>
    </div>
  );
}

