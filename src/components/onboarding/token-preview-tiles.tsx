"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandProfile } from "@/lib/brand/types";

interface TileProps {
  profile: BrandProfile;
  href: string;
  count: number;
}

function TileFrame({
  label,
  count,
  href,
  children,
  className,
}: {
  label: string;
  count: number;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        "group flex h-full flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 transition-colors",
        href ? "hover:border-[var(--border-default)]" : null,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-[var(--text-primary)]">
          {label}
        </span>
        <span className="font-[var(--font-geist-mono)] text-[11px] text-[var(--text-tertiary)]">
          {count}
        </span>
      </div>
      <div className="flex min-h-[64px] flex-1 items-center">{children}</div>
    </div>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  );
}

function pickPalette(profile: BrandProfile, max = 10) {
  const seen = new Set<string>();
  const out: { value: string; name: string }[] = [];
  const candidates = [
    ...profile.colors.filter((c) => c.group === "brand"),
    ...profile.colors.filter((c) => c.group === "accent"),
    ...profile.colors.filter((c) => c.group === "semantic"),
    ...profile.colors,
  ];
  for (const c of candidates) {
    const v = c.value?.toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push({ value: c.value, name: c.name });
    if (out.length >= max) break;
  }
  return out;
}

export function ColorsPreview({ profile, href, count }: TileProps) {
  const swatches = pickPalette(profile, 10);
  return (
    <TileFrame label="Colors" count={count} href={href}>
      {swatches.length === 0 ? (
        <span className="text-[12px] text-[var(--text-tertiary)]">
          No swatches detected.
        </span>
      ) : (
        <div className="flex w-full gap-1.5">
          {swatches.map((s) => (
            <div
              key={s.name}
              title={`${s.name} ${s.value}`}
              className="aspect-square flex-1 rounded-md border border-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)]"
              style={{ backgroundColor: s.value }}
            />
          ))}
        </div>
      )}
    </TileFrame>
  );
}

export function TypographyPreview({ profile, href, count }: TileProps) {
  const heading =
    profile.typography.find((t) => t.category === "heading") ??
    profile.typography[0];
  const body =
    profile.typography.find((t) => t.category === "body") ??
    profile.typography.find((t) => /body|base/.test(t.name));
  const headingFamily =
    heading?.fontFamily ??
    profile.fonts.find((f) => f.role === "primary")?.family ??
    "system-ui";
  const bodyFamily = body?.fontFamily ?? headingFamily;
  return (
    <TileFrame label="Typography" count={count} href={href}>
      <div className="flex w-full flex-col gap-1.5 leading-tight">
        <span
          style={{ fontFamily: headingFamily, fontWeight: 600, fontSize: 22 }}
          className="text-[var(--text-primary)]"
        >
          Aa
        </span>
        <span
          style={{ fontFamily: bodyFamily, fontWeight: 400, fontSize: 12 }}
          className="text-[var(--text-secondary)]"
        >
          {heading?.fontFamily?.split(",")[0] ?? "Primary font"}
        </span>
      </div>
    </TileFrame>
  );
}

export function SpacingPreview({ profile, href, count }: TileProps) {
  const sample = [...profile.spacing]
    .sort((a, b) => a.px - b.px)
    .filter((s) => s.px >= 4 && s.px <= 64)
    .slice(0, 4);
  return (
    <TileFrame label="Spacing" count={count} href={href}>
      <div className="flex w-full items-end gap-2">
        {sample.length === 0 ? (
          <span className="text-[12px] text-[var(--text-tertiary)]">
            Tailwind defaults
          </span>
        ) : (
          sample.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-1">
              <div
                className="rounded-sm bg-[var(--text-primary)]"
                style={{ width: Math.max(2, s.px), height: 6 }}
              />
              <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--text-tertiary)]">
                {s.px}
              </span>
            </div>
          ))
        )}
      </div>
    </TileFrame>
  );
}

export function ShadowsPreview({ profile, href, count }: TileProps) {
  const sample = profile.shadows.slice(0, 4);
  return (
    <TileFrame label="Shadows" count={count} href={href}>
      <div className="flex w-full items-center gap-3">
        {sample.length === 0 ? (
          <span className="text-[12px] text-[var(--text-tertiary)]">
            None detected
          </span>
        ) : (
          sample.map((s) => (
            <div
              key={s.name}
              className="size-8 rounded-md bg-[var(--bg-primary)]"
              style={{ boxShadow: s.value }}
              title={s.name}
            />
          ))
        )}
      </div>
    </TileFrame>
  );
}

export function RadiiPreview({ profile, href, count }: TileProps) {
  const sample = [...profile.radii]
    .sort((a, b) => a.px - b.px)
    .slice(0, 4);
  return (
    <TileFrame label="Radii" count={count} href={href}>
      <div className="flex w-full items-end gap-2">
        {sample.map((r) => (
          <div
            key={r.name}
            className="size-9 border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
            style={{ borderRadius: r.value }}
            title={`${r.name} (${r.value})`}
          />
        ))}
      </div>
    </TileFrame>
  );
}

export function BordersPreview({ profile, href, count }: TileProps) {
  const sample = profile.borders.slice(0, 4);
  return (
    <TileFrame label="Borders" count={count} href={href}>
      <div className="flex w-full items-center gap-3">
        {sample.map((b) => (
          <div
            key={b.name}
            className="size-9 rounded-md bg-transparent"
            style={{
              borderWidth: b.width,
              borderStyle: b.style,
              borderColor: b.color,
            }}
            title={b.name}
          />
        ))}
      </div>
    </TileFrame>
  );
}

export function AnimationsPreview({ profile, href, count }: TileProps) {
  const sample = profile.animations.slice(0, 3);
  return (
    <TileFrame label="Animations" count={count} href={href}>
      <div className="flex w-full flex-col gap-1">
        {sample.length === 0 ? (
          <span className="text-[12px] text-[var(--text-tertiary)]">
            No animations
          </span>
        ) : (
          sample.map((a) => (
            <div
              key={a.name}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="text-[var(--text-secondary)]">{a.name}</span>
              <span className="font-[var(--font-geist-mono)] text-[var(--text-tertiary)]">
                {a.duration}
              </span>
            </div>
          ))
        )}
      </div>
    </TileFrame>
  );
}

export function BreakpointsPreview({ profile, href, count }: TileProps) {
  const sample = [...profile.breakpoints]
    .sort((a, b) => a.px - b.px)
    .slice(0, 5);
  const max = sample.at(-1)?.px ?? 1;
  return (
    <TileFrame label="Breakpoints" count={count} href={href}>
      <div className="flex w-full flex-col gap-1">
        {sample.map((bp) => (
          <div key={bp.name} className="flex items-center gap-2">
            <span className="w-6 text-[10px] uppercase text-[var(--text-tertiary)]">
              {bp.name}
            </span>
            <div className="h-1 flex-1 rounded-full bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]">
              <div
                className="h-1 rounded-full bg-[var(--text-primary)]"
                style={{ width: `${Math.max(8, (bp.px / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </TileFrame>
  );
}

export function OpacityPreview({ profile, href, count }: TileProps) {
  const sample = [...profile.opacity]
    .sort((a, b) => a.value - b.value)
    .filter((o) => o.value > 0)
    .slice(0, 5);
  return (
    <TileFrame label="Opacity" count={count} href={href}>
      <div className="flex w-full items-end gap-1.5">
        {sample.map((o) => (
          <div
            key={o.name}
            className="aspect-square flex-1 rounded-sm bg-[var(--text-primary)]"
            style={{ opacity: o.value }}
            title={`${o.name} (${o.percentage})`}
          />
        ))}
      </div>
    </TileFrame>
  );
}

export function ZIndexPreview({ profile, href, count }: TileProps) {
  const sample = [...profile.zIndex]
    .sort((a, b) => a.value - b.value)
    .slice(0, 4);
  return (
    <TileFrame label="z-Index" count={count} href={href}>
      <div className="relative h-12 w-full">
        {sample.map((z, i) => (
          <div
            key={z.name}
            className="absolute size-9 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-sm"
            style={{
              left: i * 14,
              top: i * 4,
              zIndex: i,
            }}
          />
        ))}
      </div>
    </TileFrame>
  );
}

export function GradientsPreview({ profile, href, count }: TileProps) {
  const sample = profile.gradients.slice(0, 4);
  return (
    <TileFrame label="Gradients" count={count} href={href}>
      {sample.length === 0 ? (
        <span className="text-[12px] text-[var(--text-tertiary)]">
          None detected
        </span>
      ) : (
        <div className="flex w-full gap-1.5">
          {sample.map((g) => (
            <div
              key={g.name}
              className="aspect-square flex-1 rounded-md border border-[color-mix(in_srgb,var(--border-subtle)_60%,transparent)]"
              style={{ backgroundImage: g.cssValue }}
              title={g.name}
            />
          ))}
        </div>
      )}
    </TileFrame>
  );
}

function logoUrl(asset: { storageUrl?: string; path?: string } | undefined) {
  if (!asset) return null;
  return asset.storageUrl ?? null;
}

export function AssetsPreview({ profile, href, count }: TileProps) {
  const logos = profile.assets.filter((a) => a.category === "logo");
  const primaryLogoPath = profile.meta.primaryLogoPath;
  const primary =
    logos.find((a) => a.path === primaryLogoPath) ?? logos[0];
  const others = profile.assets.filter((a) => a !== primary).slice(0, 3);
  const url = logoUrl(primary);
  return (
    <TileFrame label="Assets" count={count} href={href}>
      <div className="flex w-full items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={primary?.name ?? "Logo"}
              className="max-h-9 max-w-9 object-contain"
            />
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Logo
            </span>
          )}
        </div>
        <div className="flex flex-1 gap-1.5">
          {others.map((a) => (
            <div
              key={a.path}
              className="aspect-square flex-1 rounded-sm border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)]"
              title={a.name}
            />
          ))}
        </div>
      </div>
    </TileFrame>
  );
}

export interface TokenPreviewGridProps {
  profile: BrandProfile;
  /** Optional override for tile links. Defaults to /dashboard. */
  basePath?: string;
}

export function TokenPreviewGrid({ profile, basePath }: TokenPreviewGridProps) {
  const base = basePath ?? "/dashboard";
  const counts = {
    colors: profile.colors.length,
    typography: profile.typography.length + profile.fonts.length,
    spacing: profile.spacing.length,
    shadows: profile.shadows.length,
    radii: profile.radii.length,
    borders: profile.borders.length,
    animations: profile.animations.length,
    breakpoints: profile.breakpoints.length,
    opacity: profile.opacity.length,
    zIndex: profile.zIndex.length,
    gradients: profile.gradients.length,
    assets: profile.assets.length,
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <ColorsPreview
        profile={profile}
        href={`${base}/colors`}
        count={counts.colors}
      />
      <TypographyPreview
        profile={profile}
        href={`${base}/typography`}
        count={counts.typography}
      />
      <AssetsPreview
        profile={profile}
        href={`${base}/assets`}
        count={counts.assets}
      />
      <SpacingPreview
        profile={profile}
        href={`${base}/spacing`}
        count={counts.spacing}
      />
      <ShadowsPreview
        profile={profile}
        href={`${base}/shadows`}
        count={counts.shadows}
      />
      <RadiiPreview
        profile={profile}
        href={`${base}/radii`}
        count={counts.radii}
      />
      <BordersPreview
        profile={profile}
        href={`${base}/borders`}
        count={counts.borders}
      />
      <AnimationsPreview
        profile={profile}
        href={`${base}/animations`}
        count={counts.animations}
      />
      <GradientsPreview
        profile={profile}
        href={`${base}/gradients`}
        count={counts.gradients}
      />
      <OpacityPreview
        profile={profile}
        href={`${base}/opacity`}
        count={counts.opacity}
      />
      <ZIndexPreview
        profile={profile}
        href={`${base}/zindex`}
        count={counts.zIndex}
      />
      <BreakpointsPreview
        profile={profile}
        href={`${base}/breakpoints`}
        count={counts.breakpoints}
      />
    </div>
  );
}

export function ContinueArrow() {
  return <ArrowRight className="ml-1.5 inline size-4" aria-hidden />;
}
