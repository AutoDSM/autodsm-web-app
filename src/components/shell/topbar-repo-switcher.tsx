"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useBrandStore } from "@/stores/brand";
import { useBrandRepos } from "@/hooks/use-brand-repos";

/**
 * Tiny topbar switcher to swap between connected `brand_repos`. Posts to
 * `/api/repos/select` to persist the choice and `router.refresh()` to pull
 * the new brand profile in the dashboard tree.
 */
export function TopbarRepoSwitcher() {
  const router = useRouter();
  const repoSlug = useBrandStore((s) => s.repoSlug);
  const { repos, loading } = useBrandRepos(repoSlug);
  const [pending, startTransition] = React.useTransition();

  if (loading || repos.length <= 1) {
    // No need for a switcher when there's only one repo (or none yet).
    return repoSlug ? (
      <span className="truncate text-[12px] text-[var(--text-tertiary)]">
        {repoSlug}
      </span>
    ) : null;
  }

  const onSelect = async (slug: string) => {
    if (slug === repoSlug) return;
    try {
      const res = await fetch("/api/repos/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: slug }),
      });
      if (!res.ok) return;
      startTransition(() => router.refresh());
    } catch {
      // ignore
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-2 px-2 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          disabled={pending}
        >
          <span className="truncate max-w-[180px]">{repoSlug ?? "Pick repo"}</span>
          <ChevronsUpDown size={12} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Connected repos</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {repos.map((r) => {
          const slug = `${r.owner}/${r.name}`;
          return (
            <DropdownMenuItem
              key={r.id}
              onSelect={() => void onSelect(slug)}
              className="flex items-center justify-between gap-2 text-[12.5px]"
            >
              <span className="truncate">{slug}</span>
              {r.isCurrent ? (
                <Check size={14} className="text-[var(--accent)]" aria-hidden />
              ) : (
                <span
                  className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]"
                >
                  {r.scanStatus ?? ""}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
