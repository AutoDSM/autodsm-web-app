"use client";

import * as React from "react";
import { Droplets } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
  TokenPageProvenanceLine,
} from "@/components/dashboard/brand-token-page-layout";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { TokenCard } from "@/components/dashboard/token-card";

const CHECKERBOARD = `repeating-conic-gradient(
  var(--border-subtle) 0% 25%,
  transparent 0% 50%
) 50% / 12px 12px`;

const HERO_DESC =
  "Opacity steps from your theme — previewed on a checkerboard so transparency is legible on either theme.";

export default function OpacityPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile || profile.opacity.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Opacity"
            description={HERO_DESC}
            icon={<Droplets size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
          />
        }
        metaRight={profile?.scannedAt ? <LastUpdatedLabel scannedAt={profile.scannedAt} /> : undefined}
      >
        <EmptyState
          title="No opacity tokens detected"
          description="We didn't find any opacity values in this repo."
        />
      </BrandTokenPageLayout>
    );
  }

  const sorted = [...profile.opacity].sort((a, b) => a.value - b.value);
  const source = profile.meta.cssSource || profile.meta.tailwindConfigPath || "repo";

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Opacity"
          description={HERO_DESC}
          icon={<Droplets size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <div className="space-y-8">
        <TokenPageProvenanceLine>
          Auto-extracted from {source} · {sorted.length} tokens
        </TokenPageProvenanceLine>

        <section>
          <SectionHeading description="Ordered low to high. Tiles use the accent color against a checkerboard so alpha is visible.">
            Scale
          </SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {sorted.map((o) => (
              <TokenCard
                key={o.name + o.value}
                eyebrow="OPACITY"
                tag={o.isCustom ? "custom" : undefined}
                previewHeight={140}
                previewClassName="p-0 overflow-hidden"
                preview={
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: CHECKERBOARD }}
                  >
                    <div
                      className="h-16 w-28 rounded-[10px] bg-[var(--accent)]"
                      style={{ opacity: o.value }}
                    />
                  </div>
                }
                name={o.name}
                subtitle={`opacity-${o.name}`}
                specs={[
                  { label: o.percentage },
                  { label: o.value.toFixed(2) },
                ]}
                copyValue={`opacity: ${o.value};`}
                copyLabel={`opacity: ${o.value}`}
              />
            ))}
          </div>
        </section>
      </div>
    </BrandTokenPageLayout>
  );
}
