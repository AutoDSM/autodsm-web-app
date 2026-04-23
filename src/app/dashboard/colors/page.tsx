"use client";

import * as React from "react";
import { Palette } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BrandColor } from "@/lib/brand/types";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
  TokenPageProvenanceLine,
} from "@/components/dashboard/brand-token-page-layout";
import { CompactColorTokenRow } from "@/components/dashboard/compact-color-token-row";
import { brandDashboardCardRadius } from "@/components/ui/brand-card-tokens";
import {
  TokenSearchInput,
  useDeferredQuery,
} from "@/components/dashboard/token-page-kit";
import type { ColorGroup } from "@/lib/brand/types";

function filterPalette(
  all: BrandColor[],
  kind: "primary" | "secondary",
): BrandColor[] {
  const out =
    kind === "primary"
      ? all.filter(
          (c) => c.group === "brand" || /primary/i.test(c.name),
        )
      : all.filter(
          (c) => c.group === "accent" || /secondary/i.test(c.name),
        );
  return [...out].sort((a, b) => a.name.localeCompare(b.name));
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

const HERO_DESC =
  "Palette tokens extracted from your repository—hover a swatch for channels and token details.";

const GROUPS: { id: "all" | ColorGroup; label: string }[] = [
  { id: "all", label: "All" },
  { id: "brand", label: "Brand" },
  { id: "accent", label: "Accent" },
  { id: "semantic", label: "Semantic" },
  { id: "neutral", label: "Neutral" },
  { id: "surface", label: "Surface" },
  { id: "interactive", label: "Interactive" },
  { id: "chart", label: "Chart" },
  { id: "custom", label: "Custom" },
];

export default function ColorsPage() {
  const profile = useBrandStore((s) => s.profile);
  const [search, setSearch] = React.useState("");
  const [groupTab, setGroupTab] = React.useState<string>("all");
  const q = useDeferredQuery(search);

  const onCopyHex = React.useCallback(async (displayHex: string) => {
    try {
      await navigator.clipboard.writeText(displayHex);
      toast.success("Copied HEX");
    } catch {
      toast.error("Copy failed");
    }
  }, []);

  const source =
    profile?.meta.cssSource ||
    profile?.meta.tailwindConfigPath ||
    "repo";

  if (!profile || profile.colors.length === 0) {
    return (
      <BrandTokenPageLayout
        hero={
          <BrandTokenPageHero
            title="Colors"
            description={HERO_DESC}
            icon={
              <Palette
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
          title="No colors detected"
          description="We didn't find any color tokens in this repo's source files."
        />
      </BrandTokenPageLayout>
    );
  }

  const filtered = profile.colors.filter((c) => {
    if (q && !`${c.name} ${c.value} ${c.cssVariable} ${c.hsl} ${c.rgb} ${c.group} ${c.oklch ?? ""}`.toLowerCase().includes(q)) {
      return false;
    }
    if (groupTab === "all") return true;
    return c.group === groupTab;
  });

  const primary = filterPalette(filtered, "primary");
  const secondary = filterPalette(filtered, "secondary");
  const byGroup = filtered;

  return (
    <BrandTokenPageLayout
      hero={
        <BrandTokenPageHero
          title="Colors"
          description={HERO_DESC}
          icon={
            <Palette size={20} strokeWidth={1.75} className="shrink-0" aria-hidden />
          }
        />
      }
      metaRight={<LastUpdatedLabel scannedAt={profile.scannedAt} />}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <TokenPageProvenanceLine>Auto-extracted from {source}</TokenPageProvenanceLine>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupTab(g.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                    groupTab === g.id
                      ? "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <TokenSearchInput
              value={search}
              onValueChange={setSearch}
              className="w-full min-w-0 sm:max-w-sm"
            />
          </div>
        </div>

        <Tabs defaultValue="primary" className="w-full max-w-full">
          <TabsList variant="pill" className="h-auto w-full max-w-md">
            <TabsTrigger value="primary">Curated: Primary</TabsTrigger>
            <TabsTrigger value="secondary">Curated: Secondary</TabsTrigger>
            <TabsTrigger value="allgroup">This group</TabsTrigger>
          </TabsList>

          <TabsContent value="primary" className="mt-6 outline-none">
            <PaletteListPanel
              list={primary}
              emptyLabel="No primary palette tokens in this view."
              onCopyHex={onCopyHex}
            />
          </TabsContent>
          <TabsContent value="secondary" className="mt-6 outline-none">
            <PaletteListPanel
              list={secondary}
              emptyLabel="No secondary palette tokens in this view."
              onCopyHex={onCopyHex}
            />
          </TabsContent>
          <TabsContent value="allgroup" className="mt-6 outline-none">
            <PaletteListPanel
              list={byGroup}
              emptyLabel="No colors in the selected group."
              onCopyHex={onCopyHex}
            />
          </TabsContent>
        </Tabs>
      </div>
    </BrandTokenPageLayout>
  );
}

function PaletteListPanel({
  list,
  emptyLabel,
  onCopyHex,
}: {
  list: BrandColor[];
  emptyLabel: string;
  onCopyHex: (hex: string) => void;
}) {
  if (list.length === 0) {
    return <EmptyTabStrip>{emptyLabel}</EmptyTabStrip>;
  }
  return (
    <div className="space-y-3">
      {list.map((color) => (
        <CompactColorTokenRow
          key={color.cssVariable}
          color={color}
          onCopyHex={onCopyHex}
        />
      ))}
    </div>
  );
}
