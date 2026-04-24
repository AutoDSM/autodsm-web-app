"use client";

import * as React from "react";
import { Image as ImageIcon, Images } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
} from "@/components/dashboard/brand-token-page-layout";
import { TokenPagePillTabs } from "@/components/dashboard/token-page-pill-tabs";
import { TokenCard } from "@/components/dashboard/token-card";
import Image from "next/image";
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

function AssetPreview({ asset }: { asset: BrandAsset }) {
  if (asset.storageUrl) {
    const w = asset.dimensions?.width ?? 200;
    const h = asset.dimensions?.height ?? 200;
    // SVGs are sanitized server-side and uploaded to the brand-assets bucket
    // along with rasters. Rendering as <Image>/<img> avoids any
    // dangerouslySetInnerHTML XSS surface from untrusted repos.
    return (
      <Image
        src={asset.storageUrl}
        alt={asset.name}
        width={w}
        height={h}
        unoptimized={asset.type === "svg"}
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

  // Pin the picked primary logo to the top of the Logos tab.
  const primaryLogoPath = profile.meta.primaryLogoPath;
  if (primaryLogoPath) {
    const logos = byCategory.get("logo") ?? [];
    const primary = profile.assets.find((a) => a.path === primaryLogoPath);
    if (primary && !logos.some((a) => a.path === primary.path)) {
      logos.unshift(primary);
      byCategory.set("logo", logos);
    } else if (primary) {
      const without = logos.filter((a) => a.path !== primary.path);
      byCategory.set("logo", [primary, ...without]);
    }
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
        <TokenPagePillTabs
          defaultValue={categories[0]}
          tabs={categories.map((cat) => {
            const items = byCategory.get(cat) ?? [];
            return {
              value: cat,
              label: CATEGORY_LABELS[cat],
              content: (
                <section>
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
                            <div className="flex h-full w-full items-center justify-center">
                              <AssetPreview asset={asset} />
                            </div>
                          }
                          name={asset.name}
                          subtitle={asset.path}
                          specs={specs}
                          copyValue={
                            asset.storageUrl
                              ? `<Image src="${asset.storageUrl}" alt="${asset.name}" width={${asset.dimensions?.width ?? 100}} height={${asset.dimensions?.height ?? 100}} />`
                              : asset.path
                          }
                          copyLabel={asset.storageUrl ? "Image snippet" : "Path"}
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
