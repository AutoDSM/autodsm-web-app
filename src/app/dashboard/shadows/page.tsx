"use client";

import * as React from "react";
import { Layers2 } from "lucide-react";
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
import { tokenTableScrollRegionClassName } from "@/lib/dashboard-content-layout";
import { cn } from "@/lib/utils";

const HERO_DESC =
  "Elevation tokens for cards, modals, and focus rings—extracted from your repository.";

export default function ShadowsPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile || profile.shadows.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Shadows"
            description={HERO_DESC}
            icon={
              <Layers2 size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />
            }
          />
        }
        metaRight={profile?.scannedAt ? <LastUpdatedLabel scannedAt={profile.scannedAt} /> : undefined}
      >
        <EmptyState
          title="No shadows detected"
          description="We didn't find any shadow tokens in this repo's source files."
        />
      </BrandTokenPageLayout>
    );
  }

  const source =
    profile.meta.cssSource ||
    profile.meta.tailwindConfigPath ||
    "repo";

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Shadows"
          description={HERO_DESC}
          icon={<Layers2 size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <div className="space-y-6">
        <TokenPageProvenanceLine>Auto-extracted from {source}</TokenPageProvenanceLine>

        <div className="space-y-10">
      {/* ── Section 1: Side-by-side progression ── */}
      <div>
        <h2 className="text-h2 text-[var(--text-primary)] mb-6">
          Elevation Progression
        </h2>
        {profile.shadows.map((shadow) => (
          <div key={shadow.name} className="mb-10">
            <div
              className="text-[var(--text-primary)] mb-4"
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {shadow.name}
            </div>
            <div className="flex flex-wrap justify-center gap-6 sm:justify-start">
              {/* Light surface */}
              <div className="flex w-full max-w-[160px] flex-col items-center gap-2">
                <div
                  className="flex h-[96px] w-full max-w-[160px] min-w-0 items-center justify-center rounded-xl bg-[#f9f9fa]"
                  style={{ boxShadow: shadow.value }}
                >
                  <div
                    className="h-16 w-16 rounded-xl bg-[var(--bg-elevated)]"
                    style={{ boxShadow: shadow.value }}
                  />
                </div>
                <span
                  className="text-[var(--text-tertiary)]"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
                >
                  Light surface
                </span>
              </div>

              {/* Dark surface */}
              <div className="flex w-full max-w-[160px] flex-col items-center gap-2">
                <div
                  className="flex h-[96px] w-full max-w-[160px] min-w-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "#0A0A0B", boxShadow: "none" }}
                >
                  <div
                    className="h-16 w-16 rounded-xl bg-[var(--bg-elevated)]"
                    style={{ boxShadow: shadow.value }}
                  />
                </div>
                <span
                  className="text-[var(--text-tertiary)]"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
                >
                  Dark surface
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 2: Detail rows ── */}
      <div>
        <h2 className="text-h2 text-[var(--text-primary)] mb-6">
          Token Details
        </h2>
        {profile.shadows.map((shadow) => (
          <div
            key={shadow.name}
            className="flex flex-col gap-4 border-b border-[var(--border-subtle)] py-5 md:flex-row md:items-start md:gap-6"
          >
            {/* Preview card */}
            <div
              className={cn(brandTokenSurface, "h-24 w-24 shrink-0")}
              style={{ boxShadow: shadow.value }}
            />

            {/* Middle */}
            <div className="min-w-0 flex-1 pl-2">
              <div
                className="text-[var(--text-primary)] font-medium mb-0.5"
                style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14 }}
              >
                {shadow.name}
              </div>
              <div
                className="text-[var(--text-tertiary)]"
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}
              >
                {shadow.tailwindClass}
              </div>

              {/* Collapsible layers */}
              {shadow.layers.length > 0 && (
                <details className="mt-3">
                  <summary
                    className="cursor-pointer text-[var(--text-tertiary)] select-none"
                    style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}
                  >
                    Layers ({shadow.layers.length})
                  </summary>
                  <div className={cn("mt-2", tokenTableScrollRegionClassName)}>
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr>
                          {[
                            "offsetX",
                            "offsetY",
                            "blur",
                            "spread",
                            "color",
                            "inset",
                          ].map((col) => (
                            <th
                              key={col}
                              className="text-left px-2 py-1 border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-tertiary)]"
                              style={{ fontFamily: "var(--font-geist-mono)" }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shadow.layers.map((layer, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1 border border-[var(--border-subtle)] text-[var(--text-secondary)]" style={{ fontFamily: "var(--font-geist-mono)" }}>{layer.offsetX}</td>
                            <td className="px-2 py-1 border border-[var(--border-subtle)] text-[var(--text-secondary)]" style={{ fontFamily: "var(--font-geist-mono)" }}>{layer.offsetY}</td>
                            <td className="px-2 py-1 border border-[var(--border-subtle)] text-[var(--text-secondary)]" style={{ fontFamily: "var(--font-geist-mono)" }}>{layer.blur}</td>
                            <td className="px-2 py-1 border border-[var(--border-subtle)] text-[var(--text-secondary)]" style={{ fontFamily: "var(--font-geist-mono)" }}>{layer.spread}</td>
                            <td className="px-2 py-1 border border-[var(--border-subtle)]">
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-3 h-3 rounded-sm border border-[var(--border-default)]"
                                  style={{ backgroundColor: layer.colorHex }}
                                />
                                <span
                                  className="text-[var(--text-secondary)]"
                                  style={{ fontFamily: "var(--font-geist-mono)" }}
                                >
                                  {layer.colorHex}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-1 border border-[var(--border-subtle)] text-[var(--text-secondary)]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                              {layer.inset ? "yes" : "no"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>

            {/* Right: CSS value + copy */}
            <div className="w-full min-w-0 shrink-0 md:max-w-[280px] md:shrink-0">
              <div className="flex items-start gap-1">
                <span
                  className="text-[var(--text-secondary)] break-all flex-1"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}
                >
                  {shadow.value}
                </span>
                <CopyButton value={shadow.value} />
              </div>
            </div>
          </div>
        ))}
      </div>
        </div>
      </div>
    </BrandTokenPageLayout>
  );
}
