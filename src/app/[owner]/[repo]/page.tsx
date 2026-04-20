"use client";

import * as React from "react";
import Link from "next/link";
import { useBrandStore } from "@/stores/brand";
import { countCategory } from "@/lib/brand/types";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Public Overview — PDF §12
 * Same data as authenticated dashboard overview but in a doc-style wrapper.
 * Shows hero metrics + preview strips that serve as entry points to each category.
 */
export default function PublicOverviewPage() {
  const profile = useBrandStore((s) => s.profile);
  const repoSlug = useBrandStore((s) => s.repoSlug);

  const slugForLinks =
    repoSlug ?? (profile ? `${profile.repo.owner}/${profile.repo.name}` : null);
  const base = slugForLinks ? `/${slugForLinks}` : "";

  if (!profile) {
    return (
      <EmptyState
        title="Brand book not ready"
        description="This repository has not been scanned yet."
      />
    );
  }

  const scannedAt = new Date(profile.scannedAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const metrics = [
    {
      label: "Colors",
      value: countCategory(profile, "colors"),
      href: `${base}/colors`,
    },
    {
      label: "Fonts",
      value: profile.fonts.length,
      href: `${base}/typography`,
    },
    {
      label: "Spacing",
      value: countCategory(profile, "spacing"),
      href: `${base}/spacing`,
    },
    {
      label: "Shadows",
      value: countCategory(profile, "shadows"),
      href: `${base}/shadows`,
    },
    {
      label: "Radii",
      value: countCategory(profile, "radii"),
      href: `${base}/radii`,
    },
    {
      label: "Assets",
      value: countCategory(profile, "assets"),
      href: `${base}/assets`,
    },
  ];

  const topColors = profile.colors.slice(0, 12);
  const topType = [...profile.typography]
    .sort((a, b) => b.fontSizePx - a.fontSizePx)
    .slice(0, 5);

  return (
    <div className="pb-8">
      {/* Hero */}
      <section className="mb-14">
        <div
          className="text-[var(--text-tertiary)] mb-4"
          style={{
            fontFamily: "var(--font-geist-mono)",
            fontSize: 12,
            letterSpacing: "0.04em",
          }}
        >
          BRAND BOOK · SCANNED {scannedAt.toUpperCase()}
        </div>
        <h1
          className="text-[var(--text-primary)] break-words"
          style={{
            fontFamily: "var(--font-manrope)",
            fontWeight: 700,
            fontSize: "clamp(2rem, 1.15rem + 5.25vw, 3.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          {profile.repo.owner}
          <span className="text-[var(--text-tertiary)]"> / </span>
          {profile.repo.name}
        </h1>
        <p
          className="mt-5 text-[var(--text-secondary)] max-w-[640px] text-pretty"
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: "clamp(0.9375rem, 0.88rem + 0.28vw, 1rem)",
            lineHeight: 1.55,
          }}
        >
          An auto-generated brand book extracted from the{" "}
          <a
            href={profile.repo.url}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--text-primary)] underline decoration-[var(--border-default)] underline-offset-4 hover:decoration-[var(--accent)]"
          >
            {profile.repo.owner}/{profile.repo.name}
          </a>{" "}
          repository. Every token below is pulled from the actual codebase — no
          manual curation.
        </p>
      </section>

      {/* Metrics */}
      <section className="mb-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 transition-colors duration-150 [transition-timing-function:var(--ease-standard)] hover:border-[var(--border-default)]"
          >
            <div
              className="text-[var(--text-primary)]"
              style={{
                fontFamily: "var(--font-manrope)",
                fontWeight: 600,
                fontSize: "clamp(1.375rem, 1.05rem + 1.75vw, 1.75rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {m.value}
            </div>
            <div
              className="mt-1 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors duration-150"
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: "clamp(0.6875rem, 0.65rem + 0.2vw, 0.75rem)",
                fontWeight: 500,
              }}
            >
              {m.label}
            </div>
          </Link>
        ))}
      </section>

      {/* Palette strip */}
      {topColors.length > 0 && (
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-4">
            <h2
              className="text-[var(--text-primary)]"
              style={{
                fontFamily: "var(--font-manrope)",
                fontWeight: 600,
                fontSize: "clamp(1.125rem, 0.95rem + 1vw, 1.375rem)",
                letterSpacing: "-0.02em",
              }}
            >
              Palette
            </h2>
            <Link
              href={`${base}/colors`}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors duration-150"
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 13,
              }}
            >
              All colors →
            </Link>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-[var(--border-subtle)] h-24">
            {topColors.map((c, i) => (
              <div
                key={`${c.name}-${i}`}
                className="flex-1 relative group"
                style={{ backgroundColor: c.value }}
                title={`${c.name} · ${c.value}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Type */}
      {topType.length > 0 && (
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-4">
            <h2
              className="text-[var(--text-primary)]"
              style={{
                fontFamily: "var(--font-manrope)",
                fontWeight: 600,
                fontSize: "clamp(1.125rem, 0.95rem + 1vw, 1.375rem)",
                letterSpacing: "-0.02em",
              }}
            >
              Typography
            </h2>
            <Link
              href={`${base}/typography`}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors duration-150"
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 13,
              }}
            >
              Type ladder →
            </Link>
          </div>
          <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 sm:p-8">
            {topType.map((t) => (
              <div
                key={t.name}
                className="text-[var(--text-primary)]"
                style={{
                  fontFamily: t.fontFamily,
                  fontSize: t.fontSize,
                  fontWeight: t.fontWeightNumeric,
                  lineHeight: t.lineHeight,
                  letterSpacing: t.letterSpacing,
                }}
              >
                The fox jumped over the lazy dog
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shadows preview */}
      {profile.shadows.length > 0 && (
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-4">
            <h2
              className="text-[var(--text-primary)]"
              style={{
                fontFamily: "var(--font-manrope)",
                fontWeight: 600,
                fontSize: "clamp(1.125rem, 0.95rem + 1vw, 1.375rem)",
                letterSpacing: "-0.02em",
              }}
            >
              Shadows
            </h2>
            <Link
              href={`${base}/shadows`}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors duration-150"
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 13,
              }}
            >
              All shadows →
            </Link>
          </div>
          <div className="rounded-xl bg-[var(--bg-secondary)] p-8 flex flex-wrap gap-6 justify-center">
            {profile.shadows.slice(0, 6).map((s) => (
              <div key={s.name} className="flex flex-col items-center gap-3">
                <div
                  className="w-20 h-20 rounded-xl bg-[var(--bg-elevated)]"
                  style={{ boxShadow: s.value }}
                />
                <div
                  className="text-[var(--text-tertiary)]"
                  style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11 }}
                >
                  {s.name}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
