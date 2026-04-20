"use client";

import * as React from "react";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
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

function AssetPreview({ asset }: { asset: BrandAsset }) {
  if (asset.type === "svg" && asset.content) {
    return (
      <div
        className="w-full h-full flex items-center justify-center p-4"
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
        className="max-w-full max-h-full object-contain"
      />
    );
  }
  return (
    <ImageIcon
      size={32}
      strokeWidth={1.5}
      className="text-[var(--text-tertiary)]"
    />
  );
}

export default function AssetsPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile || profile.assets.length === 0) {
    return (
      <div className="px-10 py-10 max-w-[1200px]">
        <h1 className="text-h1 text-[var(--text-primary)]">Assets</h1>
        <p className="mt-2 text-body-s text-[var(--text-secondary)] max-w-[640px]">
          Logos, icons, and images from your repo.
        </p>
        <div className="mt-10">
          <EmptyState
            title="No assets found"
            description="We didn't find any SVGs, PNGs, or images in this repo's public or assets folders."
          />
        </div>
      </div>
    );
  }

  const byCategory = new Map<BrandAsset["category"], BrandAsset[]>();
  for (const a of profile.assets) {
    const arr = byCategory.get(a.category) ?? [];
    arr.push(a);
    byCategory.set(a.category, arr);
  }

  return (
    <div className="px-10 py-10 max-w-[1200px]">
      <h1 className="text-h1 text-[var(--text-primary)]">Assets</h1>
      <p className="mt-2 text-body-s text-[var(--text-secondary)] max-w-[640px]">
        Logos, icons, illustrations, and raster assets discovered across your repo.
      </p>
      <div className="mt-4 flex items-center gap-1.5">
        <Sparkles size={14} strokeWidth={1.5} className="text-[var(--text-tertiary)]" />
        <span
          className="text-[var(--text-tertiary)]"
          style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12 }}
        >
          {profile.assets.length} assets · scanned from {profile.meta.filesScanned} files
        </span>
      </div>

      <div className="mt-10 space-y-12">
        {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((cat) => {
          const items = byCategory.get(cat) ?? [];
          return (
            <section key={cat}>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-h3 text-[var(--text-primary)]">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <span
                  className="text-[var(--text-tertiary)]"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
                >
                  {items.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {items.map((asset) => (
                  <div
                    key={asset.path}
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-hidden"
                  >
                    <div className="h-36 bg-[var(--bg-primary)] flex items-center justify-center">
                      <AssetPreview asset={asset} />
                    </div>
                    <div className="p-3">
                      <div
                        className="text-[var(--text-primary)] truncate"
                        style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13 }}
                        title={asset.name}
                      >
                        {asset.name}
                      </div>
                      <div
                        className="text-[var(--text-tertiary)] mt-0.5 flex items-center gap-2"
                        style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
                      >
                        <span className="uppercase">{asset.type}</span>
                        {asset.dimensions && (
                          <span>
                            {asset.dimensions.width}×{asset.dimensions.height}
                          </span>
                        )}
                        <span>{asset.fileSizeFormatted}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <span
                          className="text-[var(--text-tertiary)] flex-1 truncate"
                          style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
                          title={asset.path}
                        >
                          {asset.path}
                        </span>
                        <CopyButton value={asset.path} iconSize={12} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
