"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Coins, Blocks, Image as ImageIcon, Gauge } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { countCategory, BRAND_CATEGORIES } from "@/lib/brand/types";

/**
 * Overview Page — PDF §8
 * The cover of the brand book. Metric cards + live preview strips that let a
 * designer understand the entire visual identity in 10 seconds.
 */
export default function DashboardOverviewPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile) {
    return (
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <EmptyState
          icon={<Sparkles size={24} strokeWidth={1.5} />}
          title="No brand profile loaded yet"
          description="Connect a repository to extract tokens and generate your brand book."
          action={
            <Button asChild>
              <Link href="/onboarding">Connect a repository</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const tokenCount = BRAND_CATEGORIES.reduce(
    (acc, cat) => acc + countCategory(profile, cat),
    0,
  );
  const assetCount = profile.assets?.length ?? 0;
  const score = computeScore(profile);

  const topPalette = pickPaletteStrip(profile.colors);
  const typeScale = pickTypeStrip(profile.typography);
  const shadowStrip = profile.shadows.slice(0, 5);
  const radiiStrip = profile.radii.slice(0, 5);
  const spacingStrip = [...profile.spacing]
    .sort((a, b) => a.px - b.px)
    .slice(0, 8);
  const animStrip = profile.animations.slice(0, 4);

  const scannedAgo = timeAgo(profile.scannedAt);
  const sourceCaption = profile.meta.cssSource
    ? profile.meta.cssSource
    : profile.meta.tailwindConfigPath ?? "repository";

  return (
    <div className="w-full min-w-0 max-w-[1280px] px-6 py-8 sm:px-10 sm:py-10">
      {/* Heading */}
      <h1 className="text-h1 text-[var(--text-primary)]">Your brand</h1>
      <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
        {profile.repo.owner} / {profile.repo.name} · auto-generated
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
        <Sparkles size={14} strokeWidth={1.5} className="text-[var(--accent)]" />
        <span>Last scan: {scannedAgo}</span>
        <span>·</span>
        <span className="font-[var(--font-geist-mono)]">{sourceCaption}</span>
      </div>

      {/* Metric cards */}
      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Tokens"
          icon={<Coins size={18} strokeWidth={1.5} />}
          value={String(tokenCount)}
        />
        <MetricCard
          label="Components"
          icon={<Blocks size={18} strokeWidth={1.5} />}
          value="—"
          muted
          tooltip="Coming soon"
        />
        <MetricCard
          label="Assets"
          icon={<ImageIcon size={18} strokeWidth={1.5} />}
          value={String(assetCount)}
        />
        <MetricCard
          label="Score"
          icon={<Gauge size={18} strokeWidth={1.5} />}
          value={`${score}%`}
        />
      </div>

      {/* Brand Palette */}
      <Section title="Brand Palette" href="/dashboard/colors">
        {topPalette.length === 0 ? (
          <EmptyStrip>No colors detected yet.</EmptyStrip>
        ) : (
          <div className="flex flex-wrap gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5">
            {topPalette.map((c) => (
              <Link
                key={c.cssVariable || c.value + c.name}
                href="/dashboard/colors"
                className="group flex flex-col items-center"
              >
                <div
                  className="h-14 w-14 rounded-xl border border-[var(--border-default)] transition-transform duration-150 [transition-timing-function:var(--ease-standard)] group-hover:scale-[1.04]"
                  style={{ backgroundColor: c.value }}
                  aria-label={c.name}
                />
                <div className="mt-1.5 text-[11px] text-[var(--text-tertiary)] truncate max-w-[60px]">
                  {c.name}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Type Scale */}
      <Section title="Type Scale" href="/dashboard/typography">
        {typeScale.length === 0 ? (
          <EmptyStrip>No typography detected yet.</EmptyStrip>
        ) : (
          <div className="flex flex-col gap-2">
            {typeScale.map((t) => (
              <div
                key={t.name + t.fontSize}
                className="flex items-baseline gap-4 truncate"
              >
                <span className="text-[11px] font-[var(--font-geist-mono)] text-[var(--text-tertiary)] w-[96px] shrink-0">
                  {t.name}
                </span>
                <span
                  className="truncate text-[var(--text-primary)]"
                  style={{
                    fontSize: Math.min(t.fontSizePx, 40),
                    fontWeight: t.fontWeightNumeric,
                    fontFamily: t.fontFamily,
                    lineHeight: t.lineHeight,
                  }}
                >
                  The quick brown fox jumps
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Shadow Scale */}
      <Section title="Shadow Scale" href="/dashboard/shadows">
        {shadowStrip.length === 0 ? (
          <EmptyStrip>No shadows detected yet.</EmptyStrip>
        ) : (
          <div className="flex gap-6 flex-wrap bg-[var(--bg-canvas)] p-6 rounded-xl border border-[var(--border-subtle)]">
            {shadowStrip.map((s) => (
              <div
                key={s.name + s.value}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="h-16 w-16 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                  style={{ boxShadow: s.value }}
                />
                <span className="text-[11px] font-[var(--font-geist-mono)] text-[var(--text-tertiary)]">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Radii */}
      <Section title="Border Radii" href="/dashboard/radii">
        {radiiStrip.length === 0 ? (
          <EmptyStrip>No radii detected yet.</EmptyStrip>
        ) : (
          <div className="flex gap-6 items-end flex-wrap">
            {radiiStrip.map((r) => (
              <div key={r.name + r.value} className="flex flex-col items-center gap-2">
                <div
                  className="h-14 w-14 bg-[var(--accent-subtle)] border border-[var(--border-default)]"
                  style={{ borderRadius: r.value }}
                />
                <span className="text-[11px] font-[var(--font-geist-mono)] text-[var(--text-tertiary)]">
                  {r.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Spacing */}
      <Section title="Spacing Scale" href="/dashboard/spacing">
        {spacingStrip.length === 0 ? (
          <EmptyStrip>No spacing detected yet.</EmptyStrip>
        ) : (
          <div className="flex flex-col gap-1.5">
            {spacingStrip.map((s) => {
              const maxPx = spacingStrip[spacingStrip.length - 1]?.px || 1;
              const pct = (s.px / maxPx) * 80;
              return (
                <div key={s.name + s.rem} className="flex items-center gap-3">
                  <span className="w-[48px] text-[11px] font-[var(--font-geist-mono)] text-[var(--text-tertiary)]">
                    {s.name}
                  </span>
                  <div
                    className="h-2.5 rounded-sm bg-[var(--accent)]"
                    style={{ width: `${pct}%` }}
                  />
                  <span className="text-[11px] font-[var(--font-geist-mono)] text-[var(--text-tertiary)]">
                    {s.px}px
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Animations */}
      <Section title="Animations" href="/dashboard/animations">
        {animStrip.length === 0 ? (
          <EmptyStrip>No animations detected yet.</EmptyStrip>
        ) : (
          <div className="flex gap-4 flex-wrap">
            {animStrip.map((a) => (
              <div
                key={a.name}
                className="px-3 py-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[12px] font-[var(--font-geist-mono)] text-[var(--text-secondary)]"
              >
                {a.name} · {a.duration}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Components ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
  muted,
  tooltip,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  muted?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 ${muted ? "opacity-50" : ""}`}
      title={tooltip}
    >
      <div className="flex items-center justify-between text-[var(--text-tertiary)]">
        <span className="text-[12px] uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-[28px] font-[var(--font-manrope)] font-semibold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
        <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-[var(--text-primary)] sm:text-[16px]">
          {title}
        </h2>
        <Link
          href={href}
          className="shrink-0 text-[12px] font-medium text-[var(--accent)] transition-opacity duration-150 hover:opacity-90 [transition-timing-function:var(--ease-standard)]"
        >
          View all →
        </Link>
      </div>
      {children}
    </section>
  );
}

function EmptyStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-6 text-[13px] text-[var(--text-tertiary)]">
      {children}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type ProfileLike = NonNullable<ReturnType<typeof useBrandStore.getState>["profile"]>;

function pickPaletteStrip(colors: ProfileLike["colors"]): ProfileLike["colors"] {
  if (colors.length <= 8) return colors;
  // Prefer brand/accent/semantic, fill rest from neutral/surface
  const preferred = colors.filter(
    (c) => c.group === "brand" || c.group === "accent" || c.group === "semantic",
  );
  const rest = colors.filter((c) => !preferred.includes(c));
  return [...preferred, ...rest].slice(0, 8);
}

function pickTypeStrip(
  typography: ProfileLike["typography"],
): ProfileLike["typography"] {
  // One sample per unique size, sorted largest → smallest
  const bySize = new Map<number, ProfileLike["typography"][number]>();
  for (const t of typography) {
    if (!bySize.has(t.fontSizePx)) bySize.set(t.fontSizePx, t);
  }
  return Array.from(bySize.values())
    .sort((a, b) => b.fontSizePx - a.fontSizePx)
    .slice(0, 7);
}

function computeScore(profile: ProfileLike): number {
  // Simple scoring: +1 for each non-empty category, out of 12.
  let filled = 0;
  for (const cat of BRAND_CATEGORIES) {
    if (countCategory(profile, cat) > 0) filled += 1;
  }
  return Math.round((filled / BRAND_CATEGORIES.length) * 100);
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then || isNaN(then)) return "just now";
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
