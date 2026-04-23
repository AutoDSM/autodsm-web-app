"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Perplexity Computer `Logo-*-Text.svg` — wordmark + mark in a single file (921×329). */
const WORDMARK_NATURAL_W = 921;
const WORDMARK_NATURAL_H = 329;

/**
 * App brand SVGs. Only the Perplexity Computer `Logo-*-Text` wordmarks are used
 * (light + dark for `next-themes`); no separate glyph mark.
 */
export const PRODUCT_BRAND = {
  wordmarkLight: "/brand/perplexity-wordmark-light.svg",
  wordmarkDark: "/brand/perplexity-wordmark-dark.svg",
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
 * Scaled app mark using the same wordmark asset (921:329) — the only brand SVG
 * in compact or inline contexts. `size` is the target height; width follows aspect ratio.
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
  const h = size;
  const w = Math.round((size * WORDMARK_NATURAL_W) / WORDMARK_NATURAL_H);

  return (
    <span className={cn("inline-flex shrink-0", className)} aria-hidden>
      <Image
        src={PRODUCT_BRAND.wordmarkLight}
        alt=""
        width={w}
        height={h}
        priority={priority}
        className="block h-auto w-auto max-w-full object-contain object-left dark:hidden"
      />
      <Image
        src={PRODUCT_BRAND.wordmarkDark}
        alt=""
        width={w}
        height={h}
        priority={priority}
        className="hidden h-auto w-auto max-w-full object-contain object-left dark:block"
      />
    </span>
  );
}
