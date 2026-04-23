"use client";

import * as React from "react";
import { BetweenHorizontalStart, Type, UnfoldVertical } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
} from "@/components/dashboard/brand-token-page-layout";
import { TypographyBodyCard } from "@/components/ui/typography-body-card";
import { TypographyContainerCard } from "@/components/ui/typography-container-card";
import { brandDashboardCardRadius } from "@/components/ui/brand-card-tokens";
import { cn } from "@/lib/utils";
import type { BrandProfile, BrandTypography } from "@/lib/brand/types";
import type { TypographyMetricTabsTuple } from "@/components/ui/typography-metric-pills";

const BODY_LOREM =
  "Type assets including fonts, weight, spacing, and individual styles. All tokens below reflect values extracted from your repository — use them as the single source of truth for product and marketing surfaces.";

const CARD_LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.";

/** `utility` tokens map to the Caption tab (no `caption` category in BrandTypography). */
function typographyByCategory(profile: BrandProfile) {
  const list = profile.typography;
  return {
    headings: list.filter((t) => t.category === "heading" || t.category === "display"),
    body: list.filter((t) => t.category === "body"),
    caption: list.filter((t) => t.category === "utility"),
  };
}

function familyLabel(fontFamily: string): string {
  return fontFamily.split(",")[0]?.replace(/['"]/g, "").trim() || "UI Sans";
}

function tokenPreviewStyle(t: BrandTypography): React.CSSProperties {
  return {
    fontFamily: t.fontFamily,
    fontSize: t.fontSize,
    fontWeight: t.fontWeightNumeric,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing?.trim() && t.letterSpacing !== "normal" ? t.letterSpacing : undefined,
    textTransform:
      t.textTransform && t.textTransform !== "none"
        ? (t.textTransform as React.CSSProperties["textTransform"])
        : undefined,
  };
}

function metricTabsForToken(
  t: BrandTypography,
  tabIconProps: { size: number; strokeWidth: number; className: string },
): TypographyMetricTabsTuple {
  return [
    {
      icon: <Type {...tabIconProps} />,
      label: `${t.fontSizePx}px`,
    },
    {
      icon: <UnfoldVertical {...tabIconProps} />,
      label: t.lineHeight && t.lineHeight !== "normal" ? t.lineHeight : "Auto",
    },
    {
      icon: <BetweenHorizontalStart {...tabIconProps} />,
      label:
        t.letterSpacing?.trim() && t.letterSpacing !== "normal"
          ? t.letterSpacing
          : "0%",
    },
  ];
}

function EmptyTabStrip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        brandDashboardCardRadius,
        "border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-8 text-center text-[13px] text-[var(--text-tertiary)]",
      )}
    >
      {children}
    </div>
  );
}

export default function TypographyPage() {
  const profile = useBrandStore((s) => s.profile);
  const tabIconProps = { size: 14, strokeWidth: 1.75, className: "shrink-0" } as const;

  if (!profile) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Typography"
            description="Fonts, weights, and type scale extracted from your repository."
            icon={<Type size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
          />
        }
      >
        <EmptyState
          title="No typography detected"
          description="We didn't find any typography tokens in this repo's source files."
        />
      </BrandTokenPageLayout>
    );
  }

  if (profile.fonts.length === 0 && profile.typography.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Typography"
            description="Fonts, weights, and type scale extracted from your repository."
            icon={<Type size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
          />
        }
        metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
      >
        <EmptyState
          title="No typography detected"
          description="We didn't find any typography tokens in this repo's source files."
        />
      </BrandTokenPageLayout>
    );
  }

  const { headings, body, caption } = typographyByCategory(profile);
  const headingsSorted = [...headings].sort((a, b) => b.fontSizePx - a.fontSizePx);
  const bodySorted = [...body].sort((a, b) => b.fontSizePx - a.fontSizePx);
  const captionSorted = [...caption].sort((a, b) => b.fontSizePx - a.fontSizePx);

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Typography"
          description={BODY_LOREM}
          icon={<Type size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <Tabs defaultValue="headings" className="w-full max-w-full">
        <TabsList variant="pill" className="h-auto w-full max-w-md">
          <TabsTrigger value="headings">Headings</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="caption">Caption</TabsTrigger>
        </TabsList>

        <TabsContent value="headings" className="mt-6 outline-none">
          {headingsSorted.length === 0 ? (
            <EmptyTabStrip>No heading or display tokens found for this repository.</EmptyTabStrip>
          ) : (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              {headingsSorted.map((t) => (
                <TypographyContainerCard
                  key={t.name + t.fontSizePx}
                  eyebrow={t.name}
                  sampleLabel={familyLabel(t.fontFamily)}
                  displayText="Aa"
                  previewAs="div"
                  previewAriaLabel={`${t.name} typographic preview`}
                  previewStyle={tokenPreviewStyle(t)}
                  tabs={metricTabsForToken(t, tabIconProps)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="body" className="mt-6 outline-none">
          {bodySorted.length === 0 ? (
            <EmptyTabStrip>No body tokens found for this repository.</EmptyTabStrip>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bodySorted.map((t) => (
                <TypographyBodyCard
                  key={t.name + t.fontSizePx}
                  eyebrow={t.name}
                  sampleLabel={familyLabel(t.fontFamily)}
                  body={CARD_LOREM}
                  bodyStyle={tokenPreviewStyle(t)}
                  tabs={metricTabsForToken(t, tabIconProps)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="caption" className="mt-6 outline-none">
          {captionSorted.length === 0 ? (
            <EmptyTabStrip>
              No utility tokens mapped here yet. Caption styles use the{" "}
              <span className="font-medium text-[var(--text-secondary)]">utility</span>{" "}
              category from your scan.
            </EmptyTabStrip>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {captionSorted.map((t) => (
                <TypographyBodyCard
                  key={t.name + t.fontSizePx}
                  eyebrow={t.name}
                  sampleLabel={familyLabel(t.fontFamily)}
                  body={CARD_LOREM}
                  bodyStyle={tokenPreviewStyle(t)}
                  tabs={metricTabsForToken(t, tabIconProps)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </BrandTokenPageLayout>
  );
}
