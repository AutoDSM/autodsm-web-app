"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useBrandStore } from "@/stores/brand";
import { brandTokenSurfaceBordered } from "@/components/ui/brand-card-tokens";
import { dashboardMainContentClassName } from "@/lib/dashboard-content-layout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── card wrapper ──────────────────────────────────────────────────────────────

function SettingsCard({
  title,
  description,
  children,
  variant = "default",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <div
      className={cn(
        brandTokenSurfaceBordered,
        "p-5 sm:p-6",
        variant === "danger" && "border-[var(--error)]/30"
      )}
    >
      <div className="mb-4 sm:mb-5">
        <h3
          className={cn(
            "text-h3 text-[var(--text-primary)]",
            variant === "danger" && "text-[var(--error)]"
          )}
        >
          {title}
        </h3>
        {description && (
          <p className="mt-1.5 text-body-s text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const profile = useBrandStore((s) => s.profile);
  const { theme, setTheme } = useTheme();
  const [publicVisible, setPublicVisible] = React.useState(false);

  const owner = profile?.repo.owner ?? "";
  const repoName = profile?.repo.name ?? "";
  const publicUrl = `https://autodsm.dev/${owner}/${repoName}`;

  // Derive initials for avatar
  const initials = owner ? owner[0].toUpperCase() : "?";

  return (
    <div className={dashboardMainContentClassName}>
      <h1 className="text-h1 text-[var(--text-primary)]">Settings</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
        Manage your account, repository, and brand book visibility.
      </p>
      {owner && repoName ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[12px] text-[var(--text-tertiary)]">
          <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
            {owner}/{repoName}
          </span>
        </p>
      ) : null}

      <div className="mt-8 space-y-4 sm:mt-10 sm:space-y-6">
        {/* ── 1. Account ── */}
        <SettingsCard
          title="Account"
          description="Your profile details linked to this brand book."
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)] flex items-center justify-center shrink-0"
              aria-label="Avatar"
            >
              <span
                className="text-[var(--accent)] font-semibold"
                style={{ fontFamily: "var(--font-geist-sans)", fontSize: 16 }}
              >
                {initials}
              </span>
            </div>
            <div
              className="text-[var(--text-secondary)]"
              style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13 }}
            >
              {owner || "—"}
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div>
              <label
                className="block mb-1 text-body-s text-[var(--text-secondary)]"
                htmlFor="email"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="max-w-[360px]"
                readOnly
              />
            </div>
            <div>
              <label
                className="block mb-1 text-body-s text-[var(--text-secondary)]"
                htmlFor="display-name"
              >
                Display name
              </label>
              <Input
                id="display-name"
                type="text"
                placeholder="Your name"
                className="max-w-[360px]"
                readOnly
              />
            </div>
          </div>

          <Button variant="danger" size="sm">
            Sign out
          </Button>
        </SettingsCard>

        {/* ── 2. Repository ── */}
        <SettingsCard
          title="Repository"
          description="The connected GitHub repository that AutoDSM scans."
        >
          <div className="space-y-3 mb-5">
            <div>
              <div
                className="text-body-s text-[var(--text-tertiary)] mb-1"
              >
                Connected repository
              </div>
              <div
                className="text-[var(--text-primary)] font-medium"
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: 14 }}
              >
                {owner && repoName ? `${owner}/${repoName}` : "—"}
              </div>
            </div>
            <div>
              <div className="text-body-s text-[var(--text-tertiary)] mb-1">
                GitHub App
              </div>
              <div className="text-body-s text-[var(--text-secondary)]">
                Not installed
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm">
              Refresh scan
            </Button>
            <Button variant="outline" size="sm">
              Change repo
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="danger" size="sm" type="button">
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect repository?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This stops syncing tokens from {owner && repoName ? `${owner}/${repoName}` : "your repo"}.
                    You can reconnect a repository later from onboarding.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="danger">Disconnect</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SettingsCard>

        {/* ── 3. Visibility ── */}
        <SettingsCard
          title="Visibility"
          description="Control whether your brand book is publicly accessible."
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-body-s text-[var(--text-primary)] font-medium mb-0.5">
                Public brand book
              </div>
              <div
                className="text-[var(--text-tertiary)]"
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}
              >
                autodsm.dev/{owner || "owner"}/{repoName || "repo"}
              </div>
            </div>
            {/* Toggle */}
            <button
              role="switch"
              aria-checked={publicVisible}
              onClick={() => setPublicVisible((v) => !v)}
              className="relative w-11 h-6 rounded-full border border-[var(--border-default)] transition-colors duration-150"
              style={{
                backgroundColor: publicVisible
                  ? "var(--accent)"
                  : "var(--bg-tertiary)",
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-150"
                style={{
                  transform: publicVisible
                    ? "translateX(20px)"
                    : "translateX(0)",
                }}
              />
            </button>
          </div>

          {publicVisible && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 shadow-none">
              <span
                className="flex-1 text-[var(--text-secondary)] truncate"
                style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}
              >
                {publicUrl}
              </span>
              <CopyButton value={publicUrl} />
            </div>
          )}
        </SettingsCard>

        {/* ── 4. Appearance ── */}
        <SettingsCard
          title="Appearance"
          description="Choose how AutoDSM looks on this device."
        >
          <div className="flex gap-3">
            {(["light", "dark", "system"] as const).map((t) => {
              const active = theme === t;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-body-s font-medium transition-all duration-150 [transition-timing-function:var(--ease-standard)]"
                  style={{
                    borderColor: active
                      ? "var(--accent)"
                      : "var(--border-subtle)",
                    backgroundColor: active
                      ? "var(--accent-subtle)"
                      : "var(--bg-secondary)",
                    color: active
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: active ? "var(--accent)" : "var(--border-default)",
                    }}
                  >
                    {active && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                      />
                    )}
                  </span>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              );
            })}
          </div>
        </SettingsCard>

        {/* ── 5. GitHub ── */}
        <SettingsCard
          title="GitHub"
          description="Install the AutoDSM GitHub App for private repository access."
        >
          <Button variant="secondary" size="sm" disabled>
            Install for private repos
          </Button>
          <p className="mt-2 text-body-s text-[var(--text-tertiary)]">
            Required for scanning private repositories. Available soon.
          </p>
        </SettingsCard>

        {/* ── 6. Danger Zone ── */}
        <SettingsCard title="Danger Zone" variant="danger">
          <p className="text-body-s text-[var(--text-secondary)] mb-4">
            Permanently delete your account and all associated data. This
            action cannot be undone.
          </p>
          <Button variant="danger" size="sm">
            Delete account
          </Button>
        </SettingsCard>
      </div>
    </div>
  );
}
