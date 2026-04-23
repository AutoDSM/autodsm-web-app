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
    <Link
      href={href}
      className={cn(
        "group flex flex-col items-center justify-center gap-2 rounded-2xl p-4 outline-none",
        "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]",
        "transition-[transform,opacity,border-color,background-color] duration-150 [transition-timing-function:var(--ease-standard)]",
        "hover:opacity-[0.98] hover:border-[var(--border-default)] hover:bg-[var(--bg-secondary)]",
        "active:scale-[0.99]",
        "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
        className,
      )}
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-subtle)]/60 text-[var(--accent)]">
        <Icon size={26} strokeWidth={1.75} aria-hidden />
      </div>
      <div
        className="text-center text-[13px] font-medium text-[var(--text-primary)]"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        {label}
      </div>
    </Link>
  );
}

