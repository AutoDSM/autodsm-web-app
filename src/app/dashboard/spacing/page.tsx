"use client";

import * as React from "react";
import { UnfoldVertical } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
  TokenPageProvenanceLine,
} from "@/components/dashboard/brand-token-page-layout";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { TokenRow, TokenRowGroup } from "@/components/dashboard/token-row";
import { TokenCard } from "@/components/dashboard/token-card";
import type { BrandSpacing } from "@/lib/brand/types";

const HERO_DESC =
  "Padding, margin, and gap values extracted from your repository — tap any row to copy the CSS value.";

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
    profile.meta.cssSource || profile.meta.tailwindConfigPath || "repo";

  const sorted = [...profile.spacing].sort((a, b) => a.px - b.px);
  const maxPx = Math.max(...sorted.map((s) => s.px), 1);

  // Lookup map by name
  const spacingMap: Record<string, BrandSpacing> = {};
  for (const s of profile.spacing) spacingMap[s.name] = s;
  const sp4 = spacingMap["4"] ?? sorted[Math.min(3, sorted.length - 1)];
  const sp2 = spacingMap["2"] ?? sorted[Math.min(1, sorted.length - 1)];
  const sp6 = spacingMap["6"] ?? spacingMap["5"] ?? sp4;

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
      <div className="space-y-8">
        <TokenPageProvenanceLine>
          Auto-extracted from {source} · {sorted.length} tokens
        </TokenPageProvenanceLine>

        {/* ── Scale ladder ── */}
        <section>
          <SectionHeading description="Ordered from smallest to largest. Bar length is proportional to the raw pixel value.">
            Scale
          </SectionHeading>
          <TokenRowGroup>
            {sorted.map((s) => (
              <TokenRow
                key={s.name}
                preview={
                  <div
                    aria-hidden
                    className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[var(--bg-secondary)]"
                  >
                    <span
                      className="block h-1 rounded-full bg-[var(--accent)]"
                      style={{
                        width: `${Math.max(3, (s.px / maxPx) * 36)}px`,
                      }}
                    />
                  </div>
                }
                name={s.name}
                subtitle={s.tailwindClass}
                meta={
                  <div className="space-y-0.5 text-[var(--text-primary)]">
                    <div>{s.rem}</div>
                    <div className="text-[var(--text-tertiary)]">{s.px}px</div>
                  </div>
                }
                copyValue={s.rem}
                copyLabel={s.rem}
                trailingBadge={
                  s.isCustom ? (
                    <Badge variant="accent" className="h-4 px-1.5 text-[9.5px]">
                      custom
                    </Badge>
                  ) : null
                }
              />
            ))}
          </TokenRowGroup>
        </section>

        {/* ── Applied examples ── */}
        <section>
          <SectionHeading description="Live previews bound to your tokens — useful for verifying rhythm on real components.">
            Applied examples
          </SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TokenCard
              eyebrow="Padding"
              tag="p-4"
              previewHeight={140}
              preview={
                <div
                  className="flex items-center justify-center rounded-[10px] border border-dashed border-[var(--accent)]/40 bg-[var(--accent-subtle)]/60"
                  style={{ padding: sp4?.rem ?? "1rem" }}
                >
                  <div className="rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-white">
                    Content
                  </div>
                </div>
              }
              name={`padding: ${sp4?.name ?? "4"}`}
              subtitle={`p-${sp4?.name ?? "4"}`}
              specs={[
                { label: sp4?.rem ?? "1rem" },
                { label: `${sp4?.px ?? 16}px` },
              ]}
              copyValue={`padding: ${sp4?.rem ?? "1rem"};`}
              copyLabel={`padding: ${sp4?.rem ?? "1rem"}`}
            />

            <TokenCard
              eyebrow="Stack gap"
              tag={`gap-${sp4?.name ?? "4"}`}
              previewHeight={140}
              preview={
                <div
                  className="flex flex-col"
                  style={{ gap: sp4?.rem ?? "1rem" }}
                >
                  {["Alpha", "Beta", "Gamma"].map((label) => (
                    <div
                      key={label}
                      className="rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1 text-[11.5px] text-[var(--text-secondary)]"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              }
              name={`column gap: ${sp4?.name ?? "4"}`}
              subtitle={`gap-${sp4?.name ?? "4"}`}
              specs={[
                { label: sp4?.rem ?? "1rem" },
                { label: `${sp4?.px ?? 16}px` },
              ]}
              copyValue={`gap: ${sp4?.rem ?? "1rem"};`}
              copyLabel={`gap: ${sp4?.rem ?? "1rem"}`}
            />

            <TokenCard
              eyebrow="Button"
              tag={`px-${sp4?.name ?? "4"} py-${sp2?.name ?? "2"}`}
              previewHeight={140}
              preview={
                <button
                  type="button"
                  className="rounded-[8px] bg-[var(--accent)] text-[13px] font-medium text-white shadow-[var(--shadow-xs)]"
                  style={{
                    paddingInline: sp4?.rem ?? "1rem",
                    paddingBlock: sp2?.rem ?? "0.5rem",
                  }}
                >
                  Continue
                </button>
              }
              name={`button padding`}
              subtitle={`px-${sp4?.name ?? "4"} py-${sp2?.name ?? "2"}`}
              specs={[
                { label: `x ${sp4?.rem ?? "1rem"}` },
                { label: `y ${sp2?.rem ?? "0.5rem"}` },
              ]}
              copyValue={`padding: ${sp2?.rem ?? "0.5rem"} ${sp4?.rem ?? "1rem"};`}
              copyLabel={`${sp2?.rem ?? "0.5rem"} / ${sp4?.rem ?? "1rem"}`}
            />

            <TokenCard
              eyebrow="Section"
              tag={`py-${sp6?.name ?? "6"}`}
              previewHeight={140}
              preview={
                <div className="flex w-full flex-col items-center justify-center px-4">
                  <div
                    className="flex w-full flex-col items-center justify-center rounded-[10px] bg-[var(--bg-secondary)]"
                    style={{ paddingBlock: sp6?.rem ?? "1.5rem" }}
                  >
                    <div className="h-1.5 w-24 rounded-full bg-[var(--border-default)]" />
                    <div className="mt-2 h-1.5 w-16 rounded-full bg-[var(--border-subtle)]" />
                  </div>
                </div>
              }
              name={`section padding`}
              subtitle={`py-${sp6?.name ?? "6"}`}
              specs={[
                { label: sp6?.rem ?? "1.5rem" },
                { label: `${sp6?.px ?? 24}px` },
              ]}
              copyValue={`padding-block: ${sp6?.rem ?? "1.5rem"};`}
              copyLabel={`py ${sp6?.rem ?? "1.5rem"}`}
            />
          </div>
        </section>
      </div>
    </BrandTokenPageLayout>
  );
}
