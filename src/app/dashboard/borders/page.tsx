"use client";

import * as React from "react";
import { RectangleHorizontal } from "lucide-react";
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
import { TokenRow, TokenRowGroup } from "@/components/dashboard/token-row";
import { brandDashboardCardRadius } from "@/components/ui/brand-card-tokens";
import { cn } from "@/lib/utils";

const HERO_DESC =
  "Border widths, styles, and colors used across your UI — tap any row to copy the full declaration.";

function borderValue(b: {
  width: string;
  style: string;
  color: string;
}): string {
  return `${b.width} ${b.style} ${b.color}`;
}

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
    profile.meta.cssSource || profile.meta.tailwindConfigPath || "repo";

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
        <TokenPageProvenanceLine>
          Auto-extracted from {source} · {profile.borders.length} tokens
        </TokenPageProvenanceLine>

        <TokenPagePillTabs
          defaultValue="overview"
          tabs={[
            {
              value: "overview",
              label: "Overview",
              content: (
                <section>
                  <SectionHeading description="How border tokens are extracted and how to use this page.">
                    Overview
                  </SectionHeading>
                  <div
                    className={cn(
                      brandDashboardCardRadius,
                      "border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5 text-[13px] leading-relaxed text-[var(--text-secondary)]",
                    )}
                  >
                    <p>{HERO_DESC}</p>
                    <p className="mt-3 text-[var(--text-tertiary)]">
                      Use the <span className="font-medium text-[var(--text-secondary)]">Tokens</span>{" "}
                      tab to browse every declaration. Each row copies a ready-to-paste{" "}
                      <code className="rounded bg-[var(--bg-tertiary)] px-1 py-0.5 font-mono text-[12px] text-[var(--text-primary)]">
                        border: …
                      </code>{" "}
                      block.
                    </p>
                  </div>
                </section>
              ),
            },
            {
              value: "tokens",
              label: "Tokens",
              content: (
                <section className="space-y-8">
                  {(
                    [
                      ["all", "All", () => true] as const,
                      ["source", "CSS variables", (b: (typeof profile.borders)[0]) => b.borderGroup === "source" || !b.borderGroup] as const,
                      ["width", "Width", (b: (typeof profile.borders)[0]) => b.borderGroup === "width"] as const,
                      ["color", "Color", (b: (typeof profile.borders)[0]) => b.borderGroup === "color"] as const,
                      ["style", "Style", (b: (typeof profile.borders)[0]) => b.borderGroup === "style"] as const,
                    ] as const
                  ).map(([id, label, filter]) => {
                    const list = profile.borders.filter(
                      (b) => (id === "all" ? true : filter(b)),
                    );
                    if (list.length === 0) return null;
                    return (
                      <div key={id}>
                        <SectionHeading description="Live border preview; row copies the full `border` shorthand.">
                          {label}
                        </SectionHeading>
                        <TokenRowGroup>
                          {list.map((b) => {
                            const css = borderValue(b);
                            return (
                              <TokenRow
                                key={b.name + b.source + id}
                                preview={
                                  <div
                                    aria-hidden
                                    className="h-10 w-10 rounded-[6px] bg-[var(--bg-elevated)]"
                                    style={{ border: css }}
                                  />
                                }
                                name={b.name}
                                subtitle={b.colorToken ?? b.color}
                                meta={
                                  <div className="space-y-0.5 text-[var(--text-primary)]">
                                    <div>
                                      {b.width}{" "}
                                      <span className="text-[var(--text-tertiary)]">·</span> {b.style}
                                    </div>
                                    <div className="text-[var(--text-tertiary)]">{b.color}</div>
                                  </div>
                                }
                                copyValue={`border: ${css};`}
                                copyLabel={css}
                              />
                            );
                          })}
                        </TokenRowGroup>
                      </div>
                    );
                  })}
                </section>
              ),
            },
          ]}
        />
      </div>
    </BrandTokenPageLayout>
  );
}
