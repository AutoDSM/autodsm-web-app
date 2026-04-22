"use client";

import * as React from "react";
import { CircleDot } from "lucide-react";
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
import { TokenCard } from "@/components/dashboard/token-card";
import { brandTokenSurface } from "@/components/ui/brand-card-tokens";
import { cn } from "@/lib/utils";

const HERO_DESC =
  "Border-radius tokens for rounded corners — see the progression, copy values, or preview on live components.";

export default function RadiiPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile || profile.radii.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Radii"
            description={HERO_DESC}
            icon={<CircleDot size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
          />
        }
        metaRight={profile?.scannedAt ? <LastUpdatedLabel scannedAt={profile.scannedAt} /> : undefined}
      >
        <EmptyState
          title="No radii detected"
          description="We didn't find any border-radius tokens in this repo's source files."
        />
      </BrandTokenPageLayout>
    );
  }

  const source =
    profile.meta.cssSource || profile.meta.tailwindConfigPath || "repo";

  const sorted = [...profile.radii].sort((a, b) => a.px - b.px);
  // Pick the "button-sized" radius (~8–10px) for applied example
  const buttonRadius =
    sorted.find((r) => r.px >= 6 && r.px <= 12) ?? sorted[Math.floor(sorted.length / 2)];
  const cardRadius =
    sorted.find((r) => r.px >= 12 && r.px <= 20) ?? sorted[sorted.length - 2] ?? sorted[0];
  const pillRadius = sorted[sorted.length - 1];

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Radii"
          description={HERO_DESC}
          icon={<CircleDot size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />}
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <div className="space-y-8">
        <TokenPageProvenanceLine>
          Auto-extracted from {source} · {sorted.length} tokens
        </TokenPageProvenanceLine>

        {/* Progression strip — one row, low chrome */}
        <section>
          <SectionHeading description="Each square shows the radius at a constant size, sorted smallest to largest.">
            Progression
          </SectionHeading>
          <div
            className={cn(
              brandTokenSurface,
              "flex flex-wrap items-end gap-6 overflow-x-auto px-5 py-6",
            )}
          >
            {sorted.map((radius) => (
              <div key={radius.name} className="flex min-w-[64px] flex-col items-center gap-2">
                <div
                  className="h-14 w-14 border border-[var(--border-default)]"
                  style={{
                    borderRadius: radius.value,
                    backgroundColor: "var(--accent-subtle)",
                  }}
                />
                <div className="text-center">
                  <div
                    className="text-[11px] font-medium text-[var(--text-primary)]"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {radius.name}
                  </div>
                  <div
                    className="text-[10.5px] text-[var(--text-tertiary)]"
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {radius.px}px
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Applied examples — 2-col */}
        <section>
          <SectionHeading description="Radii wired into real components so you can preview the final corners.">
            Applied examples
          </SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TokenCard
              eyebrow="Button"
              tag={buttonRadius?.tailwindClass ?? buttonRadius?.name}
              previewHeight={140}
              preview={
                <button
                  type="button"
                  className="h-9 bg-[var(--accent)] px-4 text-[13px] font-medium text-white"
                  style={{ borderRadius: buttonRadius?.value }}
                >
                  Continue
                </button>
              }
              name={`button radius`}
              subtitle={buttonRadius?.tailwindClass}
              specs={[
                { label: buttonRadius?.value ?? "—" },
                { label: `${buttonRadius?.px ?? 0}px` },
              ]}
              copyValue={`border-radius: ${buttonRadius?.value ?? "0"};`}
              copyLabel={buttonRadius?.value ?? "—"}
            />
            <TokenCard
              eyebrow="Card"
              tag={cardRadius?.tailwindClass ?? cardRadius?.name}
              previewHeight={140}
              preview={
                <div
                  className="flex h-20 w-32 items-center justify-center border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]"
                  style={{ borderRadius: cardRadius?.value }}
                >
                  <span className="text-[12px] text-[var(--text-secondary)]">Card</span>
                </div>
              }
              name={`card radius`}
              subtitle={cardRadius?.tailwindClass}
              specs={[
                { label: cardRadius?.value ?? "—" },
                { label: `${cardRadius?.px ?? 0}px` },
              ]}
              copyValue={`border-radius: ${cardRadius?.value ?? "0"};`}
              copyLabel={cardRadius?.value ?? "—"}
            />
            <TokenCard
              eyebrow="Input"
              tag={buttonRadius?.tailwindClass ?? buttonRadius?.name}
              previewHeight={140}
              preview={
                <div
                  className="flex h-9 w-40 items-center border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 text-[13px] text-[var(--text-placeholder)]"
                  style={{ borderRadius: buttonRadius?.value }}
                >
                  name@domain.com
                </div>
              }
              name={`input radius`}
              subtitle={buttonRadius?.tailwindClass}
              specs={[
                { label: buttonRadius?.value ?? "—" },
                { label: `${buttonRadius?.px ?? 0}px` },
              ]}
              copyValue={`border-radius: ${buttonRadius?.value ?? "0"};`}
              copyLabel={buttonRadius?.value ?? "—"}
            />
            <TokenCard
              eyebrow="Pill"
              tag={pillRadius?.tailwindClass ?? pillRadius?.name}
              previewHeight={140}
              preview={
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-6 items-center gap-1 bg-[var(--accent-subtle)] px-2.5 text-[11px] font-medium text-[var(--accent)]"
                    style={{ borderRadius: pillRadius?.value }}
                  >
                    ACTIVE
                  </span>
                  <span
                    className="inline-flex h-6 items-center gap-1 bg-[var(--bg-secondary)] px-2.5 text-[11px] text-[var(--text-secondary)]"
                    style={{ borderRadius: pillRadius?.value }}
                  >
                    Draft
                  </span>
                </div>
              }
              name={`pill radius`}
              subtitle={pillRadius?.tailwindClass}
              specs={[
                { label: pillRadius?.value ?? "—" },
                { label: `${pillRadius?.px ?? 0}px` },
              ]}
              copyValue={`border-radius: ${pillRadius?.value ?? "0"};`}
              copyLabel={pillRadius?.value ?? "—"}
            />
          </div>
        </section>

        {/* Detail rows — compact */}
        <section>
          <SectionHeading description="Full list of extracted radius tokens with CSS value, Tailwind class, and pixel equivalent.">
            All tokens
          </SectionHeading>
          <TokenRowGroup>
            {sorted.map((radius) => (
              <TokenRow
                key={radius.name}
                preview={
                  <div
                    className="h-10 w-10 border border-[var(--border-default)]"
                    style={{
                      borderRadius: radius.value,
                      backgroundColor: "var(--accent-subtle)",
                    }}
                  />
                }
                name={radius.name}
                subtitle={radius.tailwindClass}
                meta={
                  <div className="space-y-0.5 text-[var(--text-primary)]">
                    <div>{radius.value}</div>
                    <div className="text-[var(--text-tertiary)]">{radius.px}px</div>
                  </div>
                }
                copyValue={radius.value}
                copyLabel={radius.value}
              />
            ))}
          </TokenRowGroup>
        </section>
      </div>
    </BrandTokenPageLayout>
  );
}
