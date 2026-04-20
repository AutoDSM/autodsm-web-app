"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Paths for Perplexity Computer brand assets in /public/brand */
export const PRODUCT_BRAND = {
  wordmarkLight: "/brand/perplexity-wordmark-light.svg",
  wordmarkDark: "/brand/perplexity-wordmark-dark.svg",
  icon: "/brand/perplexity-icon.svg",
} as const;

/** Light-theme wordmark (dark ink) vs dark-theme wordmark (light ink). Matches next-themes `class` strategy. */
export function ProductWordmark({
  width = 120,
  height = 43,
  priority,
  className,
}: {
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center shrink-0", className)}>
      <Image
        src={PRODUCT_BRAND.wordmarkLight}
        alt="Perplexity Computer"
        width={width}
        height={height}
        priority={priority}
        className="block dark:hidden max-w-full h-auto"
      />
      <Image
        src={PRODUCT_BRAND.wordmarkDark}
        alt="Perplexity Computer"
        width={width}
        height={height}
        priority={priority}
        className="hidden dark:block max-w-full h-auto"
      />
    </span>
  );
}

/**
 * Mark-only icon (purple mark). Same asset in light and dark; works on token backgrounds.
 */
export function ProductIcon({
  size = 24,
  className,
  priority,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const w = Math.round(size * (169 / 200));
  return (
    <Image
      src={PRODUCT_BRAND.icon}
      alt=""
      width={w}
      height={size}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
      aria-hidden
    />
  );
}
