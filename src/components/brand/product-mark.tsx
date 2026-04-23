"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export type ProductWordmarkVariant = "perplexity" | "autodsm";

const WORDMARK_DIMS: Record<ProductWordmarkVariant, { w: number; h: number }> = {
  perplexity: { w: 921, h: 329 },
  /** `public/brand/autodsm-wordmark-*.svg` — full mark (LightMode / DarkMode), 921×329 */
  autodsm: { w: 921, h: 329 },
};

/**
 * App brand SVGs. Only the Perplexity Computer `Logo-*-Text` wordmarks are used
 * (light + dark for `next-themes`); no separate glyph mark.
 */
export const PRODUCT_BRAND = {
  wordmarkLight: "/brand/perplexity-wordmark-light.svg",
  wordmarkDark: "/brand/perplexity-wordmark-dark.svg",
} as const;

/** Core `autoDSM` wordmarks — used on `/demo` and design-system surfaces, distinct from in-app Perplexity marks. */
export const AUTODSM_PRODUCT_BRAND = {
  wordmarkLight: "/brand/autodsm-wordmark-light.svg",
  wordmarkDark: "/brand/autodsm-wordmark-dark.svg",
} as const;

/**
 * Full product wordmark. Default variant is Perplexity; `autodsm` uses 921×329 `autodsm-wordmark-*.svg` (LightMode / DarkMode).
 * Height is derived from width from each variant’s natural aspect ratio.
 */
export function ProductWordmark({
  width = 160,
  height: heightOverride,
  priority,
  className,
  variant = "perplexity",
}: {
  width?: number;
  /** Prefer leaving unset; if set, must match 921:329 or layout may clip. */
  height?: number;
  priority?: boolean;
  className?: string;
  /** `autodsm` = core app wordmark on public `/demo`; default matches production app marketing. */
  variant?: ProductWordmarkVariant;
}) {
  const { w: nw, h: nh } = WORDMARK_DIMS[variant];
  const height = heightOverride ?? Math.round((width * nh) / nw);
  const assets = variant === "autodsm" ? AUTODSM_PRODUCT_BRAND : PRODUCT_BRAND;
  const alt = variant === "autodsm" ? "autoDSM" : "Perplexity Computer";

  return (
    <span className={cn("inline-flex items-center shrink-0", className)}>
      <Image
        src={assets.wordmarkLight}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="block h-auto max-w-full dark:hidden"
      />
      <Image
        src={assets.wordmarkDark}
        alt={alt}
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
  variant = "perplexity",
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  variant?: ProductWordmarkVariant;
}) {
  const { w: nw, h: nh } = WORDMARK_DIMS[variant];
  const h = size;
  const w = Math.round((size * nw) / nh);
  const assets = variant === "autodsm" ? AUTODSM_PRODUCT_BRAND : PRODUCT_BRAND;

  return (
    <span className={cn("inline-flex shrink-0", className)} aria-hidden>
      <Image
        src={assets.wordmarkLight}
        alt=""
        width={w}
        height={h}
        priority={priority}
        className="block h-auto w-auto max-w-full object-contain object-left dark:hidden"
      />
      <Image
        src={assets.wordmarkDark}
        alt=""
        width={w}
        height={h}
        priority={priority}
        className="hidden h-auto w-auto max-w-full object-contain object-left dark:block"
      />
    </span>
  );
}
