"use client";

import * as React from "react";
import Image from "next/image";
import { ProductIcon } from "@/components/brand/product-mark";
import type { BrandAsset, BrandProfile } from "@/lib/brand/types";
import { cn } from "@/lib/utils";

function scoreLogoAsset(a: BrandAsset): number {
  // Prefer SVG content (most faithful).
  if (a.type === "svg" && a.content) return 1_000_000;
  // Then prefer raster with storageUrl (renderable in prod).
  if (a.storageUrl) {
    const w = a.dimensions?.width ?? 0;
    const h = a.dimensions?.height ?? 0;
    return 1000 + w * h;
  }
  // Lowest: file path only.
  return 1;
}

function pickBestLogo(assets: BrandAsset[] | undefined): BrandAsset | null {
  const logos = (assets ?? []).filter((a) => a.category === "logo");
  if (logos.length === 0) return null;
  return [...logos].sort((a, b) => scoreLogoAsset(b) - scoreLogoAsset(a))[0] ?? null;
}

export function DashboardLogoHero({
  profile,
  className,
}: {
  profile: BrandProfile;
  className?: string;
}) {
  const best = React.useMemo(() => pickBestLogo(profile.assets), [profile.assets]);
  const title = profile.meta.projectName ?? profile.repo.name ?? "Project";

  return (
    <section
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]",
        className,
      )}
      aria-label="Project logo"
    >
      <div className="flex w-full items-center justify-center px-6 py-10 sm:px-10 sm:py-12">
        {best?.type === "svg" && best.content ? (
          <div
            className={cn(
              "max-h-[140px] w-full max-w-[720px]",
              "flex items-center justify-center",
              "[&_svg]:max-h-[140px] [&_svg]:max-w-full",
            )}
            // SVG is extracted from repo files; we render as a preview (same approach as Assets page).
            dangerouslySetInnerHTML={{ __html: best.content }}
          />
        ) : best?.storageUrl ? (
          <Image
            src={best.storageUrl}
            alt={best.name || `${title} logo`}
            width={best.dimensions?.width ?? 720}
            height={best.dimensions?.height ?? 160}
            className="max-h-[140px] w-auto max-w-full object-contain"
            priority
          />
        ) : (
          <div className="flex items-center gap-3 text-[var(--text-primary)]">
            <ProductIcon size={32} priority />
            <span className="text-[20px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-geist-sans)" }}>
              {title}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

