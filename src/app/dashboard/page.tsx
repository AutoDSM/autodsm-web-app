"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useBrandStore } from "@/stores/brand";
import { BRAND_CATEGORIES, CATEGORY_LABELS, countCategory, type BrandCategory } from "@/lib/brand/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format-time";
import { dashboardMainContentClassName } from "@/lib/dashboard-content-layout";
import { DashboardLogoHero } from "@/components/dashboard/dashboard-logo-hero";
import { DashboardOptionTile } from "@/components/dashboard/dashboard-option-tile";
import { DASHBOARD_CATEGORY_ICONS } from "@/lib/dashboard-category-icons";

const ACCENT_HEX = "#9D11FF";

/**
 * Overview — design-system snapshot: quick links to every token category that has data.
 */
export default function DashboardOverviewPage() {
  const profile = useBrandStore((s) => s.profile);

  if (!profile) {
    return (
      <div className={dashboardMainContentClassName}>
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

  const scannedAgo = timeAgo(profile.scannedAt);
  const activeTokens = BRAND_CATEGORIES.filter(
    (c) => countCategory(profile, c) > 0,
  ) as BrandCategory[];
  const cols = activeTokens.length < 9 ? 4 : 5;

  return (
    <div className={dashboardMainContentClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-h1 text-[var(--text-primary)]">{profile.meta.projectName ?? "Your GitHub project"}</h1>
          <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
            We&apos;ve successfully rendered your design system.
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--text-tertiary)]">
            {profile.repo.owner}/{profile.repo.name}
          </p>
        </div>
        <p
          className="shrink-0 text-[13px] font-medium sm:pt-0.5 sm:text-right"
          style={{ color: ACCENT_HEX }}
        >
          <span
            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
            style={{ backgroundColor: ACCENT_HEX }}
            aria-hidden
          />
          Last scan: {scannedAgo}
        </p>
      </div>

      <div className="mt-8 sm:mt-10">
        <DashboardLogoHero profile={profile} />
      </div>

      <section className="mt-10 sm:mt-12">
        <h2
          className="mb-4 text-[15px] font-semibold leading-snug tracking-tight text-[var(--text-primary)] sm:mb-5 sm:text-base"
        >
          Design tokens
        </h2>
        {activeTokens.length === 0 ? (
          <p className="text-body-s text-[var(--text-secondary)]">
            No token categories have data yet. Re-run a scan after adding styles to your repository.
          </p>
        ) : (
          <div
            className={[
              "grid grid-cols-2 items-start gap-4",
              cols === 4 ? "sm:grid-cols-4" : "sm:grid-cols-5",
            ].join(" ")}
          >
            {activeTokens.map((token) => {
              const label = CATEGORY_LABELS[token] ?? token;
              const Icon = DASHBOARD_CATEGORY_ICONS[token] ?? Sparkles;
              return (
                <DashboardOptionTile
                  key={token}
                  href={`/dashboard/${token}`}
                  label={label}
                  Icon={Icon}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
