"use client";

import * as React from "react";
import { Layers2, ChevronDown } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BrandTokenPageHero,
  BrandTokenPageLayout,
  LastUpdatedLabel,
} from "@/components/dashboard/brand-token-page-layout";
import { TokenPagePillTabs } from "@/components/dashboard/token-page-pill-tabs";
import { TokenCard } from "@/components/dashboard/token-card";
import { CopyButton } from "@/components/dashboard/token-page-kit";
import { cn } from "@/lib/utils";
import type { BrandProfile, BrandShadow } from "@/lib/brand/types";

const HERO_DESC =
  "Elevation tokens for cards, modals, and focus rings — toggle surface to preview shadow behavior on light or dark backgrounds.";

type Surface = "light" | "dark";

function ShadowPreview({
  shadow,
  surface,
}: {
  shadow: BrandShadow;
  surface: Surface;
}) {
  const bg = surface === "light" ? "#ffffff" : "#0b0b0d";
  const chip = surface === "light" ? "#ffffff" : "#1a1a1d";
  const chipBorder =
    surface === "light" ? "rgba(17,17,17,0.06)" : "rgba(255,255,255,0.06)";
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ backgroundColor: bg }}
    >
      <div
        className="h-14 w-20 rounded-[10px] border"
        style={{
          backgroundColor: chip,
          borderColor: chipBorder,
          boxShadow: shadow.value,
        }}
      />
    </div>
  );
}

function LayerTable({ shadow }: { shadow: BrandShadow }) {
  if (shadow.layers.length === 0) return null;
  return (
    <details className="group -mx-1 mt-1">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-2 rounded-[6px] px-1 py-1.5",
          "text-[11px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)]",
        )}
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        <span>
          {shadow.layers.length} layer{shadow.layers.length === 1 ? "" : "s"}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={1.6}
          className="transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-1 overflow-hidden rounded-[8px] border border-[var(--border-subtle)]">
        <table
          className="w-full border-collapse text-[10.5px]"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <thead>
            <tr className="bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
              {["in", "x", "y", "blur", "spread", "color", ""].map((c, idx) => (
                <th key={idx} className="px-2 py-1 text-left font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shadow.layers.map((layer, i) => (
              <tr
                key={i}
                className="border-t border-[var(--border-subtle)] text-[var(--text-secondary)]"
              >
                <td className="px-2 py-1">
                  {layer.inset ? <span className="text-[var(--text-tertiary)]">inset</span> : "—"}
                </td>
                <td className="px-2 py-1">{layer.offsetX}</td>
                <td className="px-2 py-1">{layer.offsetY}</td>
                <td className="px-2 py-1">{layer.blur}</td>
                <td className="px-2 py-1">{layer.spread}</td>
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-sm border border-[var(--border-default)]"
                      style={{ backgroundColor: layer.colorHex }}
                    />
                    <span className="max-w-[140px] truncate" title={layer.color}>
                      {layer.colorVarRef ?? layer.color}
                    </span>
                  </div>
                </td>
                <td className="px-1 py-0.5">
                  <CopyButton
                    text={[
                      layer.inset ? "inset" : "",
                      layer.offsetX,
                      layer.offsetY,
                      layer.blur,
                      layer.spread,
                      layer.color,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    label="Layer"
                    size="sm"
                    className="h-7 text-[10px] px-1.5"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ShadowsElevationPanel({
  profile,
  surface,
}: {
  profile: BrandProfile;
  surface: Surface;
}) {
  return (
    <section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {profile.shadows.map((shadow) => (
          <TokenCard
            key={shadow.name}
            eyebrow={shadow.tailwindClass ?? shadow.name}
            tag={shadow.isCustom ? "custom" : undefined}
            previewHeight={140}
            previewClassName="p-0 overflow-hidden"
            preview={<ShadowPreview shadow={shadow} surface={surface} />}
            name={shadow.name}
            subtitle={shadow.tailwindClass}
            specs={[
              { label: `${shadow.layers.length || 1}L` },
              { label: surface === "light" ? "light" : "dark" },
              ...(shadow.tokenRefs?.length
                ? [{ label: shadow.tokenRefs.join(" · ") }]
                : []),
            ]}
            copyValue={shadow.value}
            copyLabel="box-shadow"
            footer={
              <div className="space-y-1">
                {shadow.tokenRefs?.length ? (
                  <p className="text-[10px] text-[var(--text-tertiary)]" style={{ fontFamily: "var(--font-geist-mono)" }}>
                    Refs: {shadow.tokenRefs.join(", ")}
                  </p>
                ) : null}
                <LayerTable shadow={shadow} />
              </div>
            }
          />
        ))}
      </div>
    </section>
  );
}

export default function ShadowsPage() {
  const profile = useBrandStore((s) => s.profile);
  const [surface, setSurface] = React.useState<Surface>("light");

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
        <TokenPagePillTabs
          value={surface}
          onValueChange={(v) => setSurface(v as Surface)}
          tabs={[
            {
              value: "light",
              label: "Light",
              content: <ShadowsElevationPanel profile={profile} surface="light" />,
            },
            {
              value: "dark",
              label: "Dark",
              content: <ShadowsElevationPanel profile={profile} surface="dark" />,
            },
          ]}
        />
      </div>
    </BrandTokenPageLayout>
  );
}
