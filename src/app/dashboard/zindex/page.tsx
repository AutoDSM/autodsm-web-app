"use client";

import * as React from "react";
import { Layers3 } from "lucide-react";
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
import { brandTokenSurface } from "@/components/ui/brand-card-tokens";
import {
  TokenSearchInput,
  useDeferredQuery,
} from "@/components/dashboard/token-page-kit";
import { cn } from "@/lib/utils";

const HERO_DESC =
  "Stacking order tokens visualised as layered planes — higher values render above lower ones.";

export default function ZIndexPage() {
  const profile = useBrandStore((s) => s.profile);
  const [q, setQ] = React.useState("");
  const d = useDeferredQuery(q);
  const valueCounts = React.useMemo(() => {
    const m = new Map<number, number>();
    for (const z of profile?.zIndex ?? []) {
      m.set(z.value, (m.get(z.value) ?? 0) + 1);
    }
    return m;
  }, [profile?.zIndex]);

  if (!profile || profile.zIndex.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Z-Index"
            description={HERO_DESC}
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
  const duplicateValues = [...valueCounts.entries()]
    .filter(([, c]) => c > 1)
    .map(([v]) => v);
  const filtered = sorted.filter((z) => {
    if (!d) return true;
    return `${z.name} ${z.value} ${z.source} ${z.inferredRole ?? ""} ${z.tailwindClass}`
      .toLowerCase()
      .includes(d);
  });
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
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <TokenPageProvenanceLine>
              Auto-extracted from {source} · {sorted.length} tokens
            </TokenPageProvenanceLine>
            <TokenSearchInput value={q} onValueChange={setQ} className="w-full sm:max-w-xs" />
          </div>
          {duplicateValues.length > 0 ? (
            <p className="text-[12px] text-amber-600 dark:text-amber-400" role="status">
              Same z-index value used {duplicateValues.length} time
              {duplicateValues.length > 1 ? "s" : ""}: {duplicateValues.join(", ")} — may cause stacking
              issues.
            </p>
          ) : null}
        </div>

        <TokenPagePillTabs
          defaultValue="stack"
          tabs={[
            {
              value: "stack",
              label: "Stack",
              content: (
                <section>
                  <SectionHeading description="Layers are offset along both axes to preview their stacking order on a single surface.">
                    Stack
                  </SectionHeading>
                  <div
                    className={cn(
                      brandTokenSurface,
                      "relative h-[220px] overflow-hidden px-6 py-6",
                    )}
                  >
                    <div className="relative mx-auto h-full w-full max-w-[420px]">
                      {filtered.map((z, i) => {
                        const offset = i * 16;
                        return (
                          <div
                            key={z.name + z.value}
                            className="absolute flex h-[68px] w-[240px] items-center justify-between rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 shadow-[var(--shadow-xs)]"
                            style={{
                              top: offset,
                              left: offset,
                              zIndex: z.value,
                            }}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                                {z.inferredRole ?? z.name}
                              </p>
                              <p
                                className="truncate text-[11px] text-[var(--text-tertiary)]"
                                style={{ fontFamily: "var(--font-geist-mono)" }}
                              >
                                {z.tailwindClass}
                              </p>
                            </div>
                            <span
                              className="shrink-0 rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-primary)]"
                              style={{ fontFamily: "var(--font-geist-mono)" }}
                            >
                              {z.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              ),
            },
            {
              value: "tokens",
              label: "All tokens",
              content: (
                <section>
                  <SectionHeading description="Full token list with numeric value, Tailwind class, and inferred role (when available).">
                    All tokens
                  </SectionHeading>
                  <TokenRowGroup>
                    {filtered.map((z) => (
                      <TokenRow
                        key={z.name + z.value}
                        preview={
                          <div
                            aria-hidden
                            className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[var(--bg-secondary)]"
                          >
                            <span
                              className="text-[11px] font-medium text-[var(--text-primary)]"
                              style={{ fontFamily: "var(--font-geist-mono)" }}
                            >
                              {z.value}
                            </span>
                          </div>
                        }
                        name={z.inferredRole ?? z.name}
                        subtitle={z.tailwindClass}
                        meta={
                          <div className="space-y-0.5 text-[var(--text-primary)]">
                            <div>z-index: {z.value}</div>
                            {z.inferredRole ? (
                              <div className="text-[var(--text-tertiary)]">{z.inferredRole}</div>
                            ) : null}
                          </div>
                        }
                        copyValue={`z-index: ${z.value};`}
                        copyLabel={`z-index: ${z.value}`}
                      />
                    ))}
                  </TokenRowGroup>
                </section>
              ),
            },
          ]}
        />
      </div>
    </BrandTokenPageLayout>
  );
}
