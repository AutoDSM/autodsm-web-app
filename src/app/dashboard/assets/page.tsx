"use client";

import * as React from "react";
import { Image as ImageIcon, Images, Sun, Palette } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
  TokenPageProvenanceLine,
} from "@/components/dashboard/brand-token-page-layout";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { TokenPagePillTabs } from "@/components/dashboard/token-page-pill-tabs";
import { TokenCard } from "@/components/dashboard/token-card";
import { cn } from "@/lib/utils";
import type { BrandAsset } from "@/lib/brand/types";

const CATEGORY_ORDER: BrandAsset["category"][] = [
  "logo",
  "favicon",
  "icon",
  "illustration",
  "image",
];

const CATEGORY_LABELS: Record<BrandAsset["category"], string> = {
  logo: "Logos",
  favicon: "Favicons",
  icon: "Icons",
  illustration: "Illustrations",
  image: "Images",
};

const HERO_DESC =
  "Logos, icons, illustrations, and raster assets discovered across your repository.";

const CHECKERBOARD = `repeating-conic-gradient(
  var(--border-subtle) 0% 25%,
  transparent 0% 50%
) 50% / 12px 12px`;

type Surface = "paper" | "transparent";

function SurfaceToggle({
  value,
  onChange,
}: {
  value: Surface;
  onChange: (v: Surface) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Preview surface"
      className="inline-flex items-center gap-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-0.5"
    >
      {([
        { v: "paper", label: "Surface", Icon: Sun },
        { v: "transparent", label: "Transparent", Icon: Palette },
      ] as const).map(({ v, label, Icon }) => {
        const active = value === v;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium",
              "transition-colors duration-150 [transition-timing-function:var(--ease-standard)]",
              active
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon size={12} strokeWidth={1.6} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function AssetPreview({ asset }: { asset: BrandAsset }) {
  if (asset.type === "svg" && asset.content) {
    return (
      <div
        className="flex h-full w-full items-center justify-center p-4 [&_svg]:max-h-full [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: asset.content }}
      />
    );
  }
  if (asset.storageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- dynamic external URLs (Supabase)
      <img
        src={asset.storageUrl}
        alt={asset.name}
        className="max-h-full max-w-full object-contain p-4"
      />
    );
  }
  return (
    <ImageIcon size={32} strokeWidth={1.5} className="text-[var(--text-tertiary)]" />
  );
}

export default function AssetsPage() {
  const profile = useBrandStore((s) => s.profile);
  const [surface, setSurface] = React.useState<Surface>("paper");

  if (!profile || profile.assets.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Assets"
            description={HERO_DESC}
            icon={<Images size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
          />
        }
        metaRight={profile?.scannedAt ? <LastUpdatedLabel scannedAt={profile.scannedAt} /> : undefined}
      >
        <EmptyState
          title="No assets found"
          description="We didn't find any SVGs, PNGs, or images in this repo's public or assets folders."
        />
      </BrandTokenPageLayout>
    );
  }

  const byCategory = new Map<BrandAsset["category"], BrandAsset[]>();
  for (const a of profile.assets) {
    const arr = byCategory.get(a.category) ?? [];
    arr.push(a);
    byCategory.set(a.category, arr);
  }

  const categories = CATEGORY_ORDER.filter((c) => byCategory.has(c));

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Assets"
          description={HERO_DESC}
          icon={<Images size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <div className="space-y-6">
        <TokenPageProvenanceLine>
          {profile.assets.length} assets · scanned from {profile.meta.filesScanned} files
        </TokenPageProvenanceLine>

        <TokenPagePillTabs
          defaultValue={categories[0]}
          tabs={categories.map((cat) => {
            const items = byCategory.get(cat) ?? [];
            return {
              value: cat,
              label: CATEGORY_LABELS[cat],
              content: (
                <section>
                  <SectionHeading
                    description={`${items.length} ${items.length === 1 ? "asset" : "assets"} in this category.`}
                    action={<SurfaceToggle value={surface} onChange={setSurface} />}
                  >
                    {CATEGORY_LABELS[cat]}
                  </SectionHeading>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {items.map((asset) => {
                      const specs = [
                        { label: asset.type.toUpperCase() },
                        ...(asset.dimensions
                          ? [{ label: `${asset.dimensions.width}×${asset.dimensions.height}` }]
                          : []),
                        { label: asset.fileSizeFormatted },
                      ];
                      const alpha = asset.hasTransparency;
                      return (
                        <TokenCard
                          key={asset.path}
                          eyebrow={cat.toUpperCase()}
                          tag={alpha ? "α" : undefined}
                          previewHeight={160}
                          previewClassName="p-0 overflow-hidden"
                          preview={
                            <div
                              className="flex h-full w-full items-center justify-center"
                              style={
                                surface === "transparent"
                                  ? { background: CHECKERBOARD }
                                  : undefined
                              }
                            >
                              <AssetPreview asset={asset} />
                            </div>
                          }
                          name={asset.name}
                          subtitle={asset.path}
                          specs={specs}
                          copyValue={asset.path}
                          copyLabel={asset.path}
                        />
                      );
                    })}
                  </div>
                </section>
              ),
            };
          })}
        />
      </div>
    </BrandTokenPageLayout>
  );
}
