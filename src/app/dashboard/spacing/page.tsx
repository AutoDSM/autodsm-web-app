"use client";

import * as React from "react";
import { UnfoldVertical } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
  TokenPageProvenanceLine,
} from "@/components/dashboard/brand-token-page-layout";
import { brandTokenSurface } from "@/components/ui/brand-card-tokens";
import { cn } from "@/lib/utils";
import type { BrandSpacing } from "@/lib/brand/types";

const HERO_DESC =
  "The spacing scale used for padding, margin, and gaps—extracted from your repository.";

export default function SpacingPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile || profile.spacing.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Spacing"
            description={HERO_DESC}
            icon={
              <UnfoldVertical size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />
            }
          />
        }
        metaRight={profile?.scannedAt ? <LastUpdatedLabel scannedAt={profile.scannedAt} /> : undefined}
      >
        <EmptyState
          title="No spacing detected"
          description="We didn't find any spacing tokens in this repo's source files."
        />
      </BrandTokenPageLayout>
    );
  }

  const source =
    profile.meta.cssSource ||
    profile.meta.tailwindConfigPath ||
    "repo";

  const sorted = [...profile.spacing].sort((a, b) => a.px - b.px);
  const maxPx = Math.max(...sorted.map((s) => s.px), 1);

  // Build a quick lookup map by name
  const spacingMap: Record<string, BrandSpacing> = {};
  for (const s of profile.spacing) {
    spacingMap[s.name] = s;
  }

  // Get the 4th smallest for p-4 approximation, or the name '4'
  const sp4 = spacingMap["4"] ?? sorted[Math.min(3, sorted.length - 1)];
  const sp2 = spacingMap["2"] ?? sorted[Math.min(1, sorted.length - 1)];

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Spacing"
          description={HERO_DESC}
          icon={
            <UnfoldVertical size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />
          }
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <div className="space-y-6">
        <TokenPageProvenanceLine>Auto-extracted from {source}</TokenPageProvenanceLine>

        <div className="space-y-10">
      {/* ── Section 1: Spacing Ladder ── */}
      <div>
        <h2 className="text-h2 text-[var(--text-primary)] mb-6">
          Spacing Scale
        </h2>
        <div
          className={cn(
            brandTokenSurface,
            "divide-y divide-[var(--border-subtle)] overflow-hidden border border-[var(--border-subtle)]",
          )}
        >
          {sorted.map((s) => (
            <div
              key={s.name}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6"
            >
              {/* Left: spec */}
              <div className="w-full min-w-0 shrink-0 sm:w-[140px]">
                <div
                  className="text-[var(--text-primary)]"
                  style={{
                    fontFamily: "var(--font-geist-sans)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {s.name}
                </div>
                <div
                  className="text-[var(--text-tertiary)]"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
                >
                  {s.tailwindClass}
                </div>
                <div
                  className="text-[var(--text-tertiary)]"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
                >
                  {s.px}px · {s.rem}
                </div>
              </div>

              {/* Right: bar */}
              <div className="flex-1 relative flex items-center">
                <div
                  className="h-6 rounded-md bg-[var(--accent)]"
                  style={{
                    width: `${(s.px / maxPx) * 80}%`,
                    minWidth: s.px > 0 ? 4 : 0,
                    opacity: 0.8,
                  }}
                />
                {s.isCustom && (
                  <Badge variant="accent" className="ml-3 text-[10px]">
                    custom
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Applied Examples ── */}
      <div>
        <h2 className="text-h2 text-[var(--text-primary)] mb-6">
          Applied Examples
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Box A: padding demo */}
          <div className={cn(brandTokenSurface, "p-6")}>
            <div
              className="text-[var(--text-tertiary)] mb-3"
              style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
            >
              p-{sp4?.name ?? "4"} · padding
            </div>
            <div
              className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-[var(--text-secondary)] text-body-s"
              style={{ padding: sp4?.rem ?? "1rem" }}
            >
              Content inside p-{sp4?.name ?? "4"}
            </div>
            <div
              className="text-[var(--text-tertiary)] mt-2"
              style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
            >
              {sp4?.rem ?? "1rem"} = {sp4?.px ?? 16}px
            </div>
          </div>

          {/* Box B: gap demo */}
          <div className={cn(brandTokenSurface, "p-6")}>
            <div
              className="text-[var(--text-tertiary)] mb-3"
              style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
            >
              gap-{sp4?.name ?? "4"} · vertical stack
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: sp4?.rem ?? "1rem",
              }}
            >
              {["Chip A", "Chip B", "Chip C"].map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </div>
            <div
              className="text-[var(--text-tertiary)] mt-2"
              style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
            >
              gap: {sp4?.rem ?? "1rem"}
            </div>
          </div>

          {/* Box C: button padding demo */}
          <div className={cn(brandTokenSurface, "p-6")}>
            <div
              className="text-[var(--text-tertiary)] mb-3"
              style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
            >
              px-{sp4?.name ?? "4"} py-{sp2?.name ?? "2"} · button
            </div>
            <Button
              variant="secondary"
              size="md"
              style={{
                paddingLeft: sp4?.rem ?? "1rem",
                paddingRight: sp4?.rem ?? "1rem",
                paddingTop: sp2?.rem ?? "0.5rem",
                paddingBottom: sp2?.rem ?? "0.5rem",
              }}
            >
              px-{sp4?.name ?? "4"} py-{sp2?.name ?? "2"}
            </Button>
            <div
              className="text-[var(--text-tertiary)] mt-2"
              style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
            >
              {sp4?.rem ?? "1rem"} / {sp2?.rem ?? "0.5rem"}
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </BrandTokenPageLayout>
  );
}
