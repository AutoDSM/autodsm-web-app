"use client";

import * as React from "react";
import { RectangleHorizontal } from "lucide-react";
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

const HERO_DESC = "Border widths, styles, and colors used in your UI—extracted from your repository.";

export default function BordersPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile || profile.borders.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Borders"
            description={HERO_DESC}
            icon={
              <RectangleHorizontal
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
          title="No borders detected"
          description="We didn't find any border tokens in this repo's source files."
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
          title="Borders"
          description={HERO_DESC}
          icon={
            <RectangleHorizontal
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
      <div className="space-y-6">
        <TokenPageProvenanceLine>Auto-extracted from {source}</TokenPageProvenanceLine>

        <div className="space-y-0">
        {profile.borders.map((border, i) => {
          const borderCss = `${border.width} ${border.style} ${border.color}`;
          return (
            <div
              key={`${border.name}-${i}`}
              className="flex flex-col gap-4 border-b border-[var(--border-subtle)] py-5 lg:flex-row lg:items-center lg:gap-8"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
              {/* Preview card */}
              <div
                className={cn(
                  brandTokenSurface,
                  "flex h-16 w-24 shrink-0 items-center justify-center",
                )}
                style={{
                  border: `${border.width} ${border.style} ${border.color}`,
                }}
              />

              {/* Middle: name */}
              <div className="min-w-0 flex-1">
                <div
                  className="text-[var(--text-primary)] font-medium"
                  style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14 }}
                >
                  {border.name}
                </div>
                <div
                  className="text-[var(--text-tertiary)] mt-0.5"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}
                >
                  {border.source}
                </div>
              </div>
              </div>

              {/* Right: spec */}
              <div className="w-full min-w-0 shrink-0 lg:max-w-[300px]">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <div
                      className="text-[var(--text-tertiary)]"
                      style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10 }}
                    >
                      WIDTH
                    </div>
                    <div
                      className="text-[var(--text-primary)]"
                      style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13 }}
                    >
                      {border.width}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[var(--text-tertiary)]"
                      style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10 }}
                    >
                      STYLE
                    </div>
                    <div
                      className="text-[var(--text-primary)]"
                      style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13 }}
                    >
                      {border.style}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[var(--text-tertiary)]"
                      style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10 }}
                    >
                      COLOR
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-sm border border-[var(--border-default)]"
                        style={{ backgroundColor: border.color }}
                      />
                      <span
                        className="text-[var(--text-primary)]"
                        style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13 }}
                      >
                        {border.color}
                      </span>
                    </div>
                    {border.colorToken && (
                      <div
                        className="text-[var(--text-tertiary)]"
                        style={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: 11,
                        }}
                      >
                        {border.colorToken}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-3">
                  <span
                    className="text-[var(--text-tertiary)] break-all flex-1"
                    style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}
                  >
                    {borderCss}
                  </span>
                  <CopyButton value={borderCss} />
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </BrandTokenPageLayout>
  );
}
