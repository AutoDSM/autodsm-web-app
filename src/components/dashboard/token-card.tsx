"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  brandCardPaper,
  brandTokenSurface,
} from "@/components/ui/brand-card-tokens";

/**
 * Linear × Mintlify token card — the shared rich card for non-color /
 * non-typography tokens. Pairs with `TokenRow` + `SectionHeading`.
 *
 * Layout:
 *   ┌────────────────────────────────────────┐
 *   │ eyebrow                       tag      │
 *   │ ┌────────────────────────────────────┐ │
 *   │ │          <preview canvas>          │ │
 *   │ └────────────────────────────────────┘ │
 *   │ name                                    │
 *   │ ┌────────┬────────┬────────┐           │
 *   │ │ spec 1 │ spec 2 │ spec 3 │           │
 *   │ └────────┴────────┴────────┘           │
 *   │ [ copy · css value ]                    │
 *   └────────────────────────────────────────┘
 */
export interface TokenCardSpec {
  label: React.ReactNode;
  value?: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TokenCardProps {
  /** Small uppercase eyebrow (e.g. "SHADOW", "BORDER"). */
  eyebrow?: React.ReactNode;
  /** Right-aligned companion to the eyebrow. */
  tag?: React.ReactNode;
  /** Visual preview (required). */
  preview: React.ReactNode;
  /** Fixed height for the canvas (defaults to 140px). */
  previewHeight?: number | string;
  /** Classes on the canvas wrapper. */
  previewClassName?: string;
  /** Main token name. */
  name?: React.ReactNode;
  /** Muted sub-label under name (e.g. tailwind class). */
  subtitle?: React.ReactNode;
  /** Up to 4 spec chips. */
  specs?: TokenCardSpec[];
  /** The CSS/tailwind value to copy. */
  copyValue?: string;
  /** Label for the copy chip. Defaults to `copyValue`. */
  copyLabel?: React.ReactNode;
  /** Optional inline footer row (after copy chip). */
  footer?: React.ReactNode;
  /** Classes on the outer card. */
  className?: string;
}

export function TokenCard({
  eyebrow,
  tag,
  preview,
  previewHeight = 140,
  previewClassName,
  name,
  subtitle,
  specs,
  copyValue,
  copyLabel,
  footer,
  className,
}: TokenCardProps) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    if (!copyValue) return;
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
    <div className={cn(brandTokenSurface, "flex flex-col p-4", className)}>
      {(eyebrow != null || tag != null) && (
        <div className="mb-2 flex items-start justify-between gap-3">
          {eyebrow != null ? (
            <p className="min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-primary)] sm:text-[11px]">
              {eyebrow}
            </p>
          ) : (
            <span />
          )}
          {tag != null ? (
            <p className="shrink-0 text-[10px] font-medium text-[var(--text-primary)] opacity-50 sm:text-[11px]">
              {tag}
            </p>
          ) : null}
        </div>
      )}

      <div
        className={cn(
          "flex w-full min-w-0 items-center justify-center overflow-hidden rounded-2xl",
          brandCardPaper,
          previewClassName,
        )}
        style={{ height: typeof previewHeight === "number" ? `${previewHeight}px` : previewHeight }}
      >
        {preview}
      </div>

      {(name != null || subtitle != null) && (
        <div className="mt-3 min-w-0">
          {name != null ? (
            <p className="truncate text-[14px] font-medium leading-tight text-[var(--text-primary)]">
              {name}
            </p>
          ) : null}
          {subtitle != null ? (
            <p
              className="mt-0.5 truncate text-[12px] leading-tight text-[var(--text-tertiary)]"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      )}

      {specs && specs.length > 0 ? (
        <div
          className={cn(
            "mt-3 grid gap-2",
            specs.length === 2 && "grid-cols-2",
            specs.length === 3 && "grid-cols-3",
            specs.length >= 4 && "grid-cols-2 sm:grid-cols-4",
            specs.length === 1 && "grid-cols-1",
          )}
        >
          {specs.map((spec, i) => (
            <div
              key={i}
              className={cn(
                "flex h-6 min-w-0 items-center justify-center gap-1.5 rounded-full px-2",
                brandCardPaper,
                "text-[10px] font-medium text-[var(--text-primary)] sm:text-[11px]",
              )}
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {spec.icon != null ? (
                <span className="flex shrink-0 text-[var(--text-tertiary)] [&_svg]:size-3">
                  {spec.icon}
                </span>
              ) : null}
              <span className="min-w-0 truncate">{spec.label}</span>
              {spec.value != null ? (
                <span className="shrink-0 opacity-70">{spec.value}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {copyValue ? (
        <button
          type="button"
          onClick={copy}
          className={cn(
            "mt-3 inline-flex h-8 w-full items-center justify-between gap-2 rounded-full px-3",
            "bg-[var(--bg-code)] text-[var(--text-code)]",
            "text-[11.5px] font-medium",
            "outline-none transition-opacity duration-150 [transition-timing-function:var(--ease-standard)]",
            "hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]",
          )}
          style={{ fontFamily: "var(--font-geist-mono)" }}
          aria-label="Copy value"
        >
          <span className="min-w-0 truncate text-left">
            {copyLabel ?? copyValue}
          </span>
          {copied ? (
            <Check size={12} strokeWidth={1.8} className="shrink-0 opacity-80" />
          ) : (
            <Copy size={12} strokeWidth={1.5} className="shrink-0 opacity-70" />
          )}
        </button>
      ) : null}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}
