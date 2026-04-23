"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBrandStore } from "@/stores/brand";
import { brandTokenSurfaceBordered } from "@/components/ui/brand-card-tokens";
import { dashboardMainContentClassName } from "@/lib/dashboard-content-layout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import { createClient } from "@/lib/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { normalizeRepoInput } from "@/lib/utils";

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
  const router = useRouter();
  const [publicVisible, setPublicVisible] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState<string>("");
  const [displayName, setDisplayName] = React.useState("");
  const [personalWebsite, setPersonalWebsite] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [companyWebsite, setCompanyWebsite] = React.useState("");
  const [accountLoading, setAccountLoading] = React.useState(true);
  const [accountSaving, setAccountSaving] = React.useState(false);
  const [repoDialogOpen, setRepoDialogOpen] = React.useState(false);
  const [repoInput, setRepoInput] = React.useState("");
  const [repoSaving, setRepoSaving] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  const owner = profile?.repo.owner ?? "";
  const repoName = profile?.repo.name ?? "";
  const publicUrl = `https://autodsm.dev/${owner}/${repoName}`;

  // Derive initials for avatar
  const initials = owner ? owner[0].toUpperCase() : "?";

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setAccountLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const email = user.email ?? "";
        const name =
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          "";

        const res = await fetch("/api/onboarding", { method: "GET" });
        if (!res.ok) {
          throw new Error((await res.json())?.error ?? "Could not load onboarding profile");
        }
        const json = (await res.json()) as {
          onboarding:
            | null
            | {
                display_name: string | null;
                personal_website: string | null;
                company_name: string | null;
                company_website: string | null;
              };
        };

        if (cancelled) return;
        setUserEmail(email);
        setDisplayName(json.onboarding?.display_name ?? name);
        setPersonalWebsite(json.onboarding?.personal_website ?? "");
        setCompanyName(json.onboarding?.company_name ?? "");
        setCompanyWebsite(json.onboarding?.company_website ?? "");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not load account settings";
        if (!cancelled) toast.error(message);
      } finally {
        if (!cancelled) setAccountLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function saveAccount() {
    setAccountSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName,
          website: personalWebsite,
          companyName,
          companyWebsite,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        const err = j?.error?.message ?? j?.error ?? "Could not save settings";
        throw new Error(typeof err === "string" ? err : "Could not save settings");
      }
      toast.success("Saved settings");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setAccountSaving(false);
    }
  }

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
    }
  }

  async function refreshScan() {
    try {
      const res = await fetch("/api/scan/refresh", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const err = json?.error ?? "Could not refresh scan";
        throw new Error(typeof err === "string" ? err : "Could not refresh scan");
      }
      toast.success("Scan refresh started");
      // force server components (dashboard layout + brand load) to revalidate on next nav
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not refresh scan");
    }
  }

  async function connectRepo() {
    const normalized = normalizeRepoInput(repoInput);
    if (!normalized) {
      toast.error("Enter owner/repo or a github.com URL.");
      return;
    }
    const [nextOwner, nextName] = normalized.split("/");
    setRepoSaving(true);
    try {
      const res = await fetch("/api/repos/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: nextOwner, name: nextName }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const err = json?.error ?? "Could not connect repository";
        throw new Error(typeof err === "string" ? err : "Could not connect repository");
      }
      toast.success(`Connected ${nextOwner}/${nextName}`);
      setRepoDialogOpen(false);
      // Immediately scan the newly connected repo
      await refreshScan();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not connect repository");
    } finally {
      setRepoSaving(false);
    }
  }

  async function disconnectRepo() {
    try {
      const res = await fetch("/api/repos/disconnect", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const err = json?.error ?? "Could not disconnect repository";
        throw new Error(typeof err === "string" ? err : "Could not disconnect repository");
      }
      toast.success("Disconnected repository");
      router.replace("/onboarding/connect");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disconnect repository");
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: deleteConfirm }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const err = json?.error ?? "Could not delete account";
        throw new Error(typeof err === "string" ? err : "Could not delete account");
      }
      toast.success("Account deleted");
      setDeleteDialogOpen(false);
      router.replace("/login");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete account");
    } finally {
      setDeleting(false);
    }
  }

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
                value={accountLoading ? "" : userEmail}
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
                value={accountLoading ? "" : displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={accountLoading}
              />
            </div>
            <div>
              <label
                className="block mb-1 text-body-s text-[var(--text-secondary)]"
                htmlFor="personal-website"
              >
                Personal website
              </label>
              <Input
                id="personal-website"
                type="url"
                placeholder="https://example.com"
                className="max-w-[360px]"
                value={accountLoading ? "" : personalWebsite}
                onChange={(e) => setPersonalWebsite(e.target.value)}
                disabled={accountLoading}
              />
            </div>
            <div>
              <label
                className="block mb-1 text-body-s text-[var(--text-secondary)]"
                htmlFor="company-name"
              >
                Company name
              </label>
              <Input
                id="company-name"
                type="text"
                placeholder="Your company"
                className="max-w-[360px]"
                value={accountLoading ? "" : companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={accountLoading}
              />
            </div>
            <div>
              <label
                className="block mb-1 text-body-s text-[var(--text-secondary)]"
                htmlFor="company-website"
              >
                Company website
              </label>
              <Input
                id="company-website"
                type="url"
                placeholder="https://company.com"
                className="max-w-[360px]"
                value={accountLoading ? "" : companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                disabled={accountLoading}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={saveAccount}
              disabled={accountLoading || accountSaving}
            >
              {accountSaving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="danger" size="sm" onClick={signOut} disabled={accountLoading}>
              Sign out
            </Button>
          </div>
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
            <Button variant="secondary" size="sm" onClick={refreshScan}>
              Refresh scan
            </Button>
            <Dialog open={repoDialogOpen} onOpenChange={setRepoDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setRepoInput(owner && repoName ? `${owner}/${repoName}` : "");
                  }}
                >
                  Change repo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change repository</DialogTitle>
                  <DialogDescription>
                    Paste a GitHub URL or an <span className="font-mono">owner/repo</span> slug. We’ll scan it after connecting.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <label className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                    Repository
                  </label>
                  <Input
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="vercel/next.js or github.com/owner/repo"
                    className="h-11 rounded-xl text-[14px] bg-[var(--bg-secondary)]"
                    autoFocus
                    disabled={repoSaving}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setRepoDialogOpen(false)} disabled={repoSaving}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={connectRepo} disabled={repoSaving}>
                    {repoSaving ? "Connecting…" : "Connect & scan"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                  <AlertDialogAction variant="danger" onClick={disconnectRepo}>
                    Disconnect
                  </AlertDialogAction>
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
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="danger" size="sm" type="button">
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and associated data. Type{" "}
                  <span className="font-mono">DELETE</span> to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <label className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                  Confirmation
                </label>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Type DELETE"
                  className="h-11 rounded-xl text-[14px] bg-[var(--bg-secondary)]"
                  disabled={deleting}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting} onClick={() => setDeleteConfirm("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="danger"
                  onClick={deleteAccount}
                  disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                >
                  {deleting ? "Deleting…" : "Delete account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SettingsCard>
      </div>
    </div>
  );
}
