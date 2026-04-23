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
import { TokenPagePillTabs } from "@/components/dashboard/token-page-pill-tabs";
import { TokenCard } from "@/components/dashboard/token-card";
import { brandDashboardCardRadius } from "@/components/ui/brand-card-tokens";
import {
  TokenSearchInput,
  useDeferredQuery,
} from "@/components/dashboard/token-page-kit";
import { cn } from "@/lib/utils";

const CHECKERBOARD = `repeating-conic-gradient(
  var(--border-subtle) 0% 25%,
  transparent 0% 50%
) 50% / 12px 12px`;

const HERO_DESC =
  "Opacity steps from your theme — previewed on a checkerboard so transparency is legible on either theme.";

export default function OpacityPage() {
  const profile = useBrandStore((s) => s.profile);
  const [q, setQ] = React.useState("");
  const d = useDeferredQuery(q);

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
  const filtered = sorted.filter((o) => {
    if (!d) return true;
    return `${o.name} ${o.percentage} ${o.value} ${o.source} opacity-${o.name}`
      .toLowerCase()
      .includes(d);
  });
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
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <TokenPageProvenanceLine>
            Auto-extracted from {source} · {sorted.length} tokens
          </TokenPageProvenanceLine>
          <TokenSearchInput value={q} onValueChange={setQ} className="w-full sm:max-w-xs" />
        </div>

        <TokenPagePillTabs
          defaultValue="scale"
          tabs={[
            {
              value: "scale",
              label: "Scale",
              content: (
                <section>
                  <SectionHeading description="Ordered low to high. Tiles use the accent color against a checkerboard so alpha is visible.">
                    Scale
                  </SectionHeading>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {filtered.map((o) => (
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
                        copyValue={`opacity: ${o.value} /* or tailwind: opacity-${o.name} */`}
                        copyLabel={`opacity-${o.name}`}
                      />
                    ))}
                  </div>
                </section>
              ),
            },
            {
              value: "guide",
              label: "Guide",
              content: (
                <section>
                  <SectionHeading description="How to read alpha previews on this page.">
                    Reading the previews
                  </SectionHeading>
                  <div
                    className={cn(
                      brandDashboardCardRadius,
                      "border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5 text-[13px] leading-relaxed text-[var(--text-secondary)]",
                    )}
                  >
                    <p>{HERO_DESC}</p>
                    <p className="mt-3 text-[var(--text-tertiary)]">
                      The checkerboard pattern stands in for arbitrary backgrounds so you can judge edge
                      halos and anti-aliasing. Percentage labels map to the same numeric alpha your build
                      tools use (0–1).
                    </p>
                  </div>
                </section>
              ),
            },
          ]}
        />
      </div>
    </BrandTokenPageLayout>
  );
}
