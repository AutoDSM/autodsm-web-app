"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";

export interface BrandRepoSummary {
  id: string;
  owner: string;
  name: string;
  scanStatus: string | null;
  createdAt: string | null;
  isCurrent: boolean;
}

/**
 * Lightweight hook that lists the authenticated user's connected
 * `brand_repos` rows for use by the topbar switcher. Refreshes whenever
 * Realtime emits a change for the user's rows.
 */
export function useBrandRepos(currentRepoSlug: string | null): {
  repos: BrandRepoSummary[];
  loading: boolean;
} {
  const [repos, setRepos] = React.useState<BrandRepoSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchRepos = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRepos([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("brand_repos")
        .select("id,owner,name,scan_status,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const rows: BrandRepoSummary[] = (data ?? []).map((r) => {
        const slug = `${r.owner}/${r.name}`;
        return {
          id: r.id as string,
          owner: r.owner as string,
          name: r.name as string,
          scanStatus: (r.scan_status as string | null) ?? null,
          createdAt: (r.created_at as string | null) ?? null,
          isCurrent: slug === currentRepoSlug,
        };
      });
      setRepos(rows);
    } catch {
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }, [currentRepoSlug]);

  React.useEffect(() => {
    void fetchRepos();
  }, [fetchRepos]);

  React.useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const channel = supabase
      .channel("brand_repos:topbar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brand_repos" },
        () => {
          void fetchRepos();
        },
      )
      .subscribe();
    return () => {
      try {
        supabase?.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [fetchRepos]);

  return { repos, loading };
}
