"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BrandProfile } from "@/lib/brand/types";
import { analyzeBrandProfileCoverage } from "@/lib/brand/token-coverage";
import { buildSuggestions } from "@/lib/brand/token-suggestions";
import { Button } from "@/components/ui/button";
import { LogoUploadZone } from "@/components/brand/logo-upload-zone";
import { useBrandStore } from "@/stores/brand";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const setProfile = useBrandStore((s) => s.setProfile);
  const [profile, setLocalProfile] = React.useState(initialProfile);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [applying, setApplying] = React.useState(false);
  const [applyErr, setApplyErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    setProfile(initialProfile, repoSlug);
  }, [initialProfile, repoSlug, setProfile]);

  const coverage = React.useMemo(() => analyzeBrandProfileCoverage(profile), [profile]);
  const suggestions = React.useMemo(() => buildSuggestions(profile), [profile]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applySuggestions = async () => {
    if (selected.size === 0) {
      router.push("/dashboard");
      return;
    }
    setApplyErr(null);
    setApplying(true);
    try {
      const res = await fetch("/api/brand/apply-suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ suggestionIds: [...selected] }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApplyErr(body.error ?? `Apply failed (${res.status})`);
        return;
      }
      const next = body.brand_profile as BrandProfile | undefined;
      if (next) {
        setLocalProfile(next);
        setProfile(next, repoSlug);
      }
      router.push("/dashboard");
    } catch (e) {
      setApplyErr((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  const needsLogo = coverage.some(
    (r) => r.category === "assets" && r.suggestions.includes("assets:upload-logo"),
  );

  const rendered = coverage.filter((r) => r.status === "rendered");
  const gaps = coverage.filter((r) => r.status !== "rendered");

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          Review
        </p>
        <h1 className="mt-2 text-h2 text-[var(--text-primary)]">Token coverage</h1>
        <p className="mt-2 text-body-s text-[var(--text-secondary)]">
          We compared your scan to 12 design-token categories. Accept AutoDSM defaults where helpful,
          then continue to the dashboard.
        </p>
      </div>

      {status === "failed" && lastScanError ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)] p-4 text-[13px] text-[var(--error)]">
          Last scan note: {lastScanError}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
          Rendered
        </h2>
        <ul className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          {rendered.map((row) => (
            <li
              key={row.category}
              className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]"
            >
              <span className="text-[var(--text-primary)]">{row.label}</span>
              <span className="font-[var(--font-geist-mono)] text-[12px] text-[var(--text-tertiary)]">
                {row.count} tokens
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
          Gaps & suggestions
        </h2>
        <ul className="space-y-3">
          {gaps.map((row) => (
            <li
              key={row.category}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">
                    {row.label}{" "}
                    <span
                      className={cn(
                        "ml-2 rounded-md px-2 py-0.5 text-[11px] font-normal",
                        row.status === "missing"
                          ? "bg-[color-mix(in_srgb,var(--error)_14%,transparent)] text-[var(--error)]"
                          : "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
                      )}
                    >
                      {row.status}
                    </span>
                  </p>
                  {row.notes?.length ? (
                    <ul className="mt-2 list-disc pl-4 text-[12px] text-[var(--text-secondary)]">
                      {row.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {row.suggestions.map((sid) => {
                  const sug = suggestions.find((s) => s.id === sid);
                  if (!sug) return null;
                  if (sid === "assets:upload-logo") {
                    return needsLogo ? (
                      <LogoUploadZone
                        key={sid}
                        compact
                        onUploaded={(p) => setLocalProfile(p)}
                      />
                    ) : null;
                  }
                  const label =
                    sid === "colors:scale-from-primary"
                      ? "Generate primary shade ramp (50–900)"
                      : sid === "colors:scale-from-secondary"
                        ? "Generate secondary shade ramp (50–900)"
                        : sid === "typography:guide-from-base"
                          ? "Add modular typography guide (h1–caption)"
                          : sid;
                  return (
                    <label
                      key={sid}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-left"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected.has(sid)}
                        onChange={() => toggle(sid)}
                      />
                      <span className="text-[13px] text-[var(--text-primary)]">{label}</span>
                    </label>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {applyErr ? (
        <p className="text-[13px] text-[var(--error)]">{applyErr}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="h-11 rounded-xl">
          <Link href="/dashboard">Continue to dashboard</Link>
        </Button>
        <Button
          type="button"
          className="h-11 rounded-xl"
          disabled={applying}
          onClick={() => void applySuggestions()}
        >
          {applying
            ? "Applying…"
            : selected.size
              ? "Apply suggestions and continue"
              : "Continue to dashboard"}
        </Button>
      </div>
    </div>
  );
}
