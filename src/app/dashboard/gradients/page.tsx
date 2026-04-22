"use client";

import * as React from "react";
import { Paintbrush } from "lucide-react";
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
import { TokenRow, TokenRowGroup } from "@/components/dashboard/token-row";
import { cn } from "@/lib/utils";
import type { BrandGradient } from "@/lib/brand/types";

const HERO_DESC =
  "Gradients extracted from your theme — each card previews the fill, its stops, and the exact CSS value.";

function StopPill({ stop }: { stop: BrandGradient["stops"][number] }) {
  return (
    <div
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pl-1 pr-2",
        "text-[10.5px] font-medium text-[var(--text-primary)]",
      )}
      style={{ fontFamily: "var(--font-geist-mono)" }}
    >
      <span
        aria-hidden
        className="inline-block h-3.5 w-3.5 rounded-full border border-[var(--border-default)]"
        style={{ backgroundColor: stop.colorHex }}
      />
      <span>{stop.colorHex.toUpperCase()}</span>
      {stop.position ? (
        <span className="text-[var(--text-tertiary)]">{stop.position}</span>
      ) : null}
    </div>
  );
}

export default function GradientsPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile || profile.gradients.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Gradients"
            description={HERO_DESC}
            icon={<Paintbrush size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
          />
        }
        metaRight={profile?.scannedAt ? <LastUpdatedLabel scannedAt={profile.scannedAt} /> : undefined}
      >
        <EmptyState
          title="No gradients detected"
          description="We didn't find any gradient tokens in this repo's CSS or config."
        />
      </BrandTokenPageLayout>
    );
  }

  const source = profile.meta.cssSource || profile.meta.tailwindConfigPath || "repo";

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Gradients"
          description={HERO_DESC}
          icon={<Paintbrush size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <div className="space-y-6">
        <TokenPageProvenanceLine>
          Auto-extracted from {source} · {profile.gradients.length} tokens
        </TokenPageProvenanceLine>

        <TokenPagePillTabs
          defaultValue="gallery"
          tabs={[
            {
              value: "gallery",
              label: "Gallery",
              content: (
                <section>
                  <SectionHeading description="Previews are rendered at 140px height. Hover any stop chip to inspect its hex.">
                    All gradients
                  </SectionHeading>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {profile.gradients.map((g) => (
                      <TokenCard
                        key={g.name}
                        eyebrow={g.type.toUpperCase()}
                        tag={g.direction}
                        previewHeight={140}
                        previewClassName="p-0 overflow-hidden"
                        preview={
                          <div
                            className="h-full w-full"
                            style={{ background: g.cssValue }}
                          />
                        }
                        name={g.name}
                        subtitle={`${g.stops.length} stop${g.stops.length === 1 ? "" : "s"}`}
                        copyValue={`background: ${g.cssValue};`}
                        copyLabel={g.cssValue}
                        footer={
                          <div className="flex flex-wrap gap-1.5">
                            {g.stops.map((stop, i) => (
                              <StopPill key={i} stop={stop} />
                            ))}
                          </div>
                        }
                      />
                    ))}
                  </div>
                </section>
              ),
            },
            {
              value: "list",
              label: "List",
              content: (
                <section>
                  <SectionHeading description="Compact rows — tap to copy the full CSS background declaration.">
                    All gradients
                  </SectionHeading>
                  <TokenRowGroup>
                    {profile.gradients.map((g) => (
                      <TokenRow
                        key={g.name}
                        preview={
                          <div
                            aria-hidden
                            className="h-10 w-10 rounded-[6px] border border-[var(--border-default)]"
                            style={{ background: g.cssValue }}
                          />
                        }
                        name={g.name}
                        subtitle={g.direction}
                        meta={
                          <div className="space-y-0.5 text-[var(--text-primary)]">
                            <div className="line-clamp-2 font-mono text-[11px] text-[var(--text-tertiary)]">
                              {g.cssValue}
                            </div>
                            <div className="text-[var(--text-tertiary)]">
                              {g.stops.length} stop{g.stops.length === 1 ? "" : "s"}
                            </div>
                          </div>
                        }
                        copyValue={`background: ${g.cssValue};`}
                        copyLabel={g.cssValue}
                      />
                    ))}
                  </TokenRowGroup>
                </section>
              ),
            },
          ]}
        />
      </div>
    </BrandTokenPageLayout>
  );
}
