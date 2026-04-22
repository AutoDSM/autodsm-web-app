"use client";

import * as React from "react";
import { Layers3 } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
  TokenPageProvenanceLine,
} from "@/components/dashboard/brand-token-page-layout";
import { brandTokenSurface } from "@/components/ui/brand-card-tokens";
import { cn } from "@/lib/utils";

const HERO_DESC =
  "Stacking order scale visualized as layered planes. Higher values stack on top of lower ones.";

export default function ZIndexPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile || profile.zIndex.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Z-Index"
            description="Stacking order tokens in your UI."
            icon={<Layers3 size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
          />
        }
        metaRight={profile?.scannedAt ? <LastUpdatedLabel scannedAt={profile.scannedAt} /> : undefined}
      >
        <EmptyState
          title="No z-index tokens detected"
          description="We didn't find any z-index tokens in this repo."
        />
      </BrandTokenPageLayout>
    );
  }

  const sorted = [...profile.zIndex].sort((a, b) => a.value - b.value);
  const source = profile.meta.tailwindConfigPath || profile.meta.cssSource || "repo";

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Z-Index"
          description={HERO_DESC}
          icon={<Layers3 size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <div className="space-y-6">
        <TokenPageProvenanceLine>Auto-extracted from {source}</TokenPageProvenanceLine>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stacking diagram */}
        <div className={cn(brandTokenSurface, "min-w-0 p-4 sm:p-6")}>
          <div
            className="text-[var(--text-tertiary)] mb-4"
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10 }}
          >
            STACKING PREVIEW
          </div>
          <div className="min-w-0 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]">
          <div className="relative mx-auto h-[min(280px,50svh)] min-h-[180px] w-full min-w-[280px] sm:min-h-[240px] sm:h-[280px] sm:min-w-0">
            {sorted.map((z, i) => {
              const offset = i * 14;
              return (
                <div
                  key={z.name}
                  className="absolute w-48 h-32 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] flex items-center justify-center"
                  style={{
                    bottom: `${offset}px`,
                    right: `${offset + 40}px`,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                  }}
                >
                  <span
                    className="text-[var(--text-secondary)]"
                    style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
                  >
                    z-{z.value}
                  </span>
                </div>
              );
            })}
          </div>
          </div>
        </div>

        {/* Table */}
        <div className={cn(brandTokenSurface, "min-w-0 p-0")}>
          <div className="space-y-0">
          {sorted.map((z) => {
            const cls = `z-${z.name}`;
            return (
              <div
                key={z.name}
                className="flex flex-col gap-2 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="w-10 shrink-0 text-left sm:text-right">
                  <span
                    className="text-[var(--accent)]"
                    style={{ fontFamily: "var(--font-geist-mono)", fontSize: 14 }}
                  >
                    {z.value}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[var(--text-primary)] font-medium"
                    style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14 }}
                  >
                    {z.name}
                  </div>
                  {z.inferredRole && (
                    <div
                      className="text-[var(--text-tertiary)]"
                      style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12 }}
                    >
                      {z.inferredRole}
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-1 self-start sm:self-center">
                  <span
                    className="min-w-0 break-all text-[var(--text-tertiary)]"
                    style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}
                  >
                    {cls}
                  </span>
                  <CopyButton value={cls} iconSize={12} />
                </div>
              </div>
            );
          })}
          </div>
        </div>
        </div>
      </div>
    </BrandTokenPageLayout>
  );
}
