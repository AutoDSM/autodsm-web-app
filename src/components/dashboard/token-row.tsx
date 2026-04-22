"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Linear × Mintlify compact row for tokens that don't need a rich canvas.
 *
 * Layout:
 *   [ preview ] [ name / muted subtitle ] [ mono values ] [ copy pill ]
 *
 * Designed to be used inside a single shared `brandTokenSurface` card that
 * wraps all rows with `divide-y divide-[var(--border-subtle)]` — this keeps
 * each category's list-style identical to Colors (CompactColorTokenRow).
 */
export interface TokenRowProps {
  /** Small visual preview, 48px square by default. */
  preview: React.ReactNode;
  /** Token name / human label. */
  name: React.ReactNode;
  /** Muted second line (e.g. Tailwind class or CSS var). */
  subtitle?: React.ReactNode;
  /** Right-side mono metadata rows (e.g. `12px`, `0.75rem`). */
  meta?: React.ReactNode;
  /** Raw CSS/Tailwind value(s) placed in the copy pill. */
  copyValue: string;
  /** Visible copy pill label (falls back to copyValue truncated). */
  copyLabel?: React.ReactNode;
  /** Optional inline badge after the name (e.g. `custom`). */
  trailingBadge?: React.ReactNode;
  /** Full-row classes for override. */
  className?: string;
  /** Classes for the preview wrapper. */
  previewClassName?: string;
}

export function TokenRow({
  preview,
  name,
  subtitle,
  meta,
  copyValue,
  copyLabel,
  trailingBadge,
  className,
  previewClassName,
}: TokenRowProps) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-4 px-4 py-3",
        className,
      )}
    >
      {/* Preview */}
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center",
          previewClassName,
        )}
      >
        {preview}
      </div>

      {/* Name + subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-[14px] font-medium leading-tight text-[var(--text-primary)]">
            {name}
          </p>
          {trailingBadge}
        </div>
        {subtitle ? (
          <p
            className="mt-0.5 truncate text-[12px] leading-tight text-[var(--text-tertiary)]"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Mono meta */}
      {meta ? (
        <div
          className="hidden shrink-0 text-right sm:block"
          style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}
        >
          {meta}
        </div>
      ) : null}

      {/* Copy pill */}
      <button
        type="button"
        onClick={copy}
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5",
          "bg-[var(--bg-code)] text-[var(--text-code)]",
          "text-[11px] font-medium",
          "outline-none transition-opacity duration-150 [transition-timing-function:var(--ease-standard)]",
          "hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
        )}
        style={{ fontFamily: "var(--font-geist-mono)" }}
        aria-label="Copy value"
      >
        {copied ? (
          <Check size={12} strokeWidth={1.8} />
        ) : (
          <Copy size={12} strokeWidth={1.5} />
        )}
        <span className="max-w-[140px] truncate">
          {copyLabel ?? copyValue}
        </span>
      </button>
    </div>
  );
}

/**
 * Wrap `TokenRow`s to render as a single Linear-style card with dividers.
 */
export function TokenRowGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] divide-y divide-[var(--border-subtle)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
