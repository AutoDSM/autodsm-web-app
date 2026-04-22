"use client";

import * as React from "react";
import {
  MonitorSmartphone,
  Smartphone,
  Tablet,
  Monitor,
  Laptop,
} from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
  TokenPageProvenanceLine,
} from "@/components/dashboard/brand-token-page-layout";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { TokenRow, TokenRowGroup } from "@/components/dashboard/token-row";
import { brandTokenSurface } from "@/components/ui/brand-card-tokens";
import { cn } from "@/lib/utils";

function deviceForPx(px: number) {
  if (px < 640) return { Icon: Smartphone, label: "Mobile" };
  if (px < 1024) return { Icon: Tablet, label: "Tablet" };
  if (px < 1440) return { Icon: Laptop, label: "Laptop" };
  return { Icon: Monitor, label: "Desktop" };
}

const HERO_DESC =
  "Responsive breakpoints used across your UI. Bars scale against the largest width so you can compare at a glance.";

export default function BreakpointsPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile || profile.breakpoints.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Breakpoints"
            description={HERO_DESC}
            icon={
              <MonitorSmartphone
                size={20}
                strokeWidth={1.75}
                className="shrink-0"
                aria-hidden
              />
            }
          />
        }
        metaRight={profile?.scannedAt ? <LastUpdatedLabel scannedAt={profile.scannedAt} /> : undefined}
      >
        <EmptyState
          title="No breakpoints detected"
          description="We didn't find any breakpoint tokens in this repo."
        />
      </BrandTokenPageLayout>
    );
  }

  const sorted = [...profile.breakpoints].sort((a, b) => a.px - b.px);
  const maxPx = Math.max(...sorted.map((b) => b.px), 1);
  const source = profile.meta.tailwindConfigPath || profile.meta.cssSource || "repo";

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Breakpoints"
          description={HERO_DESC}
          icon={
            <MonitorSmartphone
              size={20}
              strokeWidth={1.75}
              className="shrink-0"
              aria-hidden
            />
          }
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <div className="space-y-8">
        <TokenPageProvenanceLine>
          Auto-extracted from {source} · {sorted.length} tokens
        </TokenPageProvenanceLine>

        {/* Ruler */}
        <section>
          <SectionHeading description="Each bar is proportional to the raw pixel width — useful for sanity-checking the media-query ladder.">
            Ruler
          </SectionHeading>
          <div className={cn(brandTokenSurface, "space-y-3 px-4 py-5")}>
            {sorted.map((b) => {
              const { Icon, label } = deviceForPx(b.px);
              const width = `${(b.px / maxPx) * 100}%`;
              return (
                <div key={b.name} className="flex items-center gap-3">
                  <div className="flex w-20 shrink-0 items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
                    <Icon size={14} strokeWidth={1.5} />
                    <span>{label}</span>
                  </div>
                  <div className="relative h-8 flex-1 overflow-hidden rounded-[6px] bg-[var(--bg-secondary)]">
                    <div
                      className="h-full rounded-[6px] bg-[var(--accent)]/80"
                      style={{ width }}
                    />
                    <span
                      className="absolute inset-y-0 right-2 flex items-center text-[11px] font-medium text-[var(--text-primary)]"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {b.px}px
                    </span>
                  </div>
                  <div
                    className="w-12 shrink-0 text-right text-[12px] font-medium text-[var(--text-primary)]"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {b.name}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Detail rows */}
        <section>
          <SectionHeading description="Each row copies the full media-query string so you can drop it straight into your CSS.">
            All breakpoints
          </SectionHeading>
          <TokenRowGroup>
            {sorted.map((b) => {
              const { Icon, label } = deviceForPx(b.px);
              return (
                <TokenRow
                  key={b.name}
                  preview={
                    <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                      <Icon size={16} strokeWidth={1.5} />
                    </div>
                  }
                  name={`${b.name} · ${label}`}
                  subtitle={`min-width: ${b.value}`}
                  meta={
                    <div className="space-y-0.5 text-[var(--text-primary)]">
                      <div>{b.value}</div>
                      <div className="text-[var(--text-tertiary)]">{b.px}px</div>
                    </div>
                  }
                  copyValue={`@media (min-width: ${b.value}) {}`}
                  copyLabel={`min-width: ${b.value}`}
                />
              );
            })}
          </TokenRowGroup>
        </section>
      </div>
    </BrandTokenPageLayout>
  );
}
