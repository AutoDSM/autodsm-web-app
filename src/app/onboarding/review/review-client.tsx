"use client";

import * as React from "react";
import Link from "next/link";
import type { BrandProfile } from "@/lib/brand/types";
import { analyzeBrandProfileCoverage } from "@/lib/brand/token-coverage";
import { Button } from "@/components/ui/button";
import { LogoUploadZone } from "@/components/brand/logo-upload-zone";
import { TokenPreviewGrid } from "@/components/onboarding/token-preview-tiles";
import { useBrandStore } from "@/stores/brand";

export function OnboardingReviewClient({
  initialProfile,
  repoSlug,
  status,
  lastScanError,
}: {
  initialProfile: BrandProfile;
  repoSlug: string;
  status: string;
  lastScanError: string | null;
}) {
  const setProfile = useBrandStore((s) => s.setProfile);
  const [profile, setLocalProfile] = React.useState(initialProfile);

  React.useEffect(() => {
    setProfile(initialProfile, repoSlug);
  }, [initialProfile, repoSlug, setProfile]);

  const coverage = React.useMemo(
    () => analyzeBrandProfileCoverage(profile),
    [profile],
  );

  const needsLogo = coverage.some(
    (r) => r.category === "assets" && r.suggestions.includes("assets:upload-logo"),
  );

  const totalTokens = React.useMemo(
    () => coverage.reduce((sum, r) => sum + r.count, 0),
    [coverage],
  );

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          Review
        </p>
        <h1 className="mt-2 text-h2 text-[var(--text-primary)]">
          Your design tokens
        </h1>
        <p className="mt-2 text-body-s text-[var(--text-secondary)]">
          We extracted {totalTokens} tokens across 12 categories from{" "}
          <span className="font-[var(--font-geist-mono)] text-[12px]">
            {repoSlug}
          </span>
          . Tap any tile to dive deeper, or continue to your dashboard.
        </p>
      </div>

      {status === "failed" && lastScanError ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)] p-4 text-[13px] text-[var(--error)]">
          Last scan note: {lastScanError}
        </div>
      ) : null}

      <TokenPreviewGrid profile={profile} />

      {needsLogo ? (
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 p-4">
          <p className="text-[13px] font-medium text-[var(--text-primary)]">
            Add your logo
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            We didn&apos;t find a primary brand logo in your repo. Upload one to
            complete the asset library.
          </p>
          <div className="mt-3">
            <LogoUploadZone
              compact
              onUploaded={(p) => setLocalProfile(p)}
            />
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button asChild className="h-11 rounded-xl">
          <Link href="/dashboard">Continue to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
