"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Natural SVG dimensions: Perplexity Computer wordmarks (`Logo-*-Text.svg`). */
const WORDMARK_NATURAL_W = 921;
const WORDMARK_NATURAL_H = 329;

/** Paths under `/public/brand`. */
export const PRODUCT_BRAND = {
  wordmarkLight: "/brand/autodsm-wordmark-light.svg",
  wordmarkDark: "/brand/autodsm-wordmark-dark.svg",
  iconLight: "/brand/autodsm-icon-light.svg",
  iconDark: "/brand/autodsm-icon-dark.svg",
} as const;

/**
 * Full Perplexity Computer wordmark. Light vs dark follows `next-themes` (`class` on `html`).
 * Height is derived from width so the 921×329 asset is never stretched.
 */
export function ProductWordmark({
  width = 160,
  height: heightOverride,
  priority,
  className,
}: {
  width?: number;
  /** Prefer leaving unset; if set, must match 921:329 or layout may clip. */
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  const height =
    heightOverride ?? Math.round((width * WORDMARK_NATURAL_H) / WORDMARK_NATURAL_W);

  return (
    <span className={cn("inline-flex items-center shrink-0", className)}>
      <Image
        src={PRODUCT_BRAND.wordmarkLight}
        alt="Perplexity Computer"
        width={width}
        height={height}
        priority={priority}
        className="block h-auto max-w-full dark:hidden"
      />
      <Image
        src={PRODUCT_BRAND.wordmarkDark}
        alt="Perplexity Computer"
        width={width}
        height={height}
        priority={priority}
        className="hidden h-auto max-w-full dark:block"
      />
    </span>
  );
}

/**
 * Mark-only (app glyph). Light vs dark asset for correct contrast on token backgrounds.
 */
export function ProductIcon({
  size = 32,
  className,
  priority,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex shrink-0", className)} aria-hidden>
      <Image
        src={PRODUCT_BRAND.iconLight}
        alt=""
        width={size}
        height={size}
        priority={priority}
        className="block shrink-0 object-contain dark:hidden"
      />
      <Image
        src={PRODUCT_BRAND.iconDark}
        alt=""
        width={size}
        height={size}
        priority={priority}
        className="hidden shrink-0 object-contain dark:block"
      />
    </span>
  );
}
