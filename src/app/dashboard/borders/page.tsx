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
import { TokenRow, TokenRowGroup } from "@/components/dashboard/token-row";

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
      <div className="space-y-8">
        <TokenPageProvenanceLine>
          Auto-extracted from {source} · {profile.borders.length} tokens
        </TokenPageProvenanceLine>

        <section>
          <SectionHeading description="Each row renders a live inline preview with the token's width, style, and color.">
            All tokens
          </SectionHeading>
          <TokenRowGroup>
            {profile.borders.map((b) => {
              const css = borderValue(b);
              return (
                <TokenRow
                  key={b.name + b.source}
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
                        {b.width} <span className="text-[var(--text-tertiary)]">·</span> {b.style}
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
        </section>
      </div>
    </BrandTokenPageLayout>
  );
}
