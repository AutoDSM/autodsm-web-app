"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProductIcon } from "@/components/brand/product-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { normalizeRepoInput } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRight, Github, Loader2 } from "lucide-react";

type RepoOption = { full_name: string; private: boolean };

export default function OnboardingPage() {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [provider, setProvider] = React.useState<"github" | "google" | null>(null);
  const [repos, setRepos] = React.useState<RepoOption[]>([]);
  const [reposLoading, setReposLoading] = React.useState(false);
  const [reposHint, setReposHint] = React.useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = React.useState(false);

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const appMetaProvider =
        (user?.app_metadata?.provider as string | undefined) ?? null;
      if (appMetaProvider === "github") setProvider("github");
      else if (appMetaProvider === "google") setProvider("google");
    });
  }, []);

  React.useEffect(() => {
    if (provider !== "github") return;
    let cancelled = false;
    setReposLoading(true);
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((body: {
        repos?: RepoOption[];
        needsGitHubReauth?: boolean;
        message?: string;
        error?: string;
      }) => {
        if (cancelled) return;
        setRepos(body.repos ?? []);
        setNeedsReauth(Boolean(body.needsGitHubReauth));
        if (body.message) setReposHint(body.message);
        else if (body.error) setReposHint(body.error);
        else setReposHint(null);
      })
      .catch(() => {
        if (!cancelled) setReposHint("Could not load repositories. Paste owner/repo below.");
      })
      .finally(() => {
        if (!cancelled) setReposLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeRepoInput(value);
    if (!normalized) {
      toast.error("Choose a repository or enter owner/repo or a github.com URL.");
      return;
    }
    router.push(`/onboarding/scanning?repo=${encodeURIComponent(normalized)}`);
  }

  const datalistId = "autodsm-github-repo-suggestions";

  return (
    <div className="grid min-h-screen min-w-0 place-items-center bg-[var(--bg-primary)] px-4 py-8 sm:px-6">
      <Card className="w-full min-w-0 max-w-[460px] p-6 sm:p-8 md:p-10">
        <ProductIcon size={28} priority />
        <h2 className="mt-6 text-h2 text-[var(--text-primary)]">Connect a repository</h2>
        <p className="mt-2 text-body-s text-[var(--text-secondary)]">
          {provider === "github"
            ? "Pick a repo you have access to, or paste any public GitHub URL or owner/repo."
            : "Paste a GitHub URL or owner/repo. Install the GitHub App for private repos."}
        </p>

        {provider === "github" && (
          <div className="mt-4 rounded-lg border-0 bg-[var(--bg-secondary)] px-3 py-2.5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--text-tertiary)]">
              <span>Your GitHub repositories</span>
              {reposLoading ? (
                <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
              ) : (
                <span>{repos.length ? `${repos.length} found` : "—"}</span>
              )}
            </div>
            {reposHint ? (
              <p className="mt-2 text-[12px] leading-[16px] text-[var(--text-secondary)]">
                {reposHint}
              </p>
            ) : null}
            {needsReauth ? (
              <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                After signing in again, return here to see the list — or paste a repo slug now.
              </p>
            ) : null}
          </div>
        )}

        <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
          {provider === "github" && repos.length > 0 ? (
            <>
              <label className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Repository
              </label>
              <Input
                placeholder="Search or type owner/repo…"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                list={datalistId}
                className="h-11 text-[14px]"
                autoComplete="off"
                autoFocus
              />
              <datalist id={datalistId}>
                {repos.map((r) => (
                  <option key={r.full_name} value={r.full_name}>
                    {r.private ? "private" : "public"}
                  </option>
                ))}
              </datalist>
            </>
          ) : (
            <Input
              placeholder="vercel/next.js"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-11 text-[14px]"
              autoFocus
            />
          )}
          <Button type="submit" size="lg" className="w-full">
            Scan repository
            <ArrowRight size={15} strokeWidth={1.8} />
          </Button>
        </form>

        {provider !== "github" && (
          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <a
              href="https://github.com/apps/autodsm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Github size={14} strokeWidth={1.5} />
              Install autoDSM on GitHub →
            </a>
            <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
              Required for private repositories.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
