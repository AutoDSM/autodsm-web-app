"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useBrandStore } from "@/stores/brand";
import type { BrandProfile } from "@/lib/brand/types";
import { ProductTintRoot } from "./product-tint-root";
import { createClient } from "@/lib/supabase/client";

/**
 * Hydrates the client-side brand store with server-fetched props.
 *
 * Sync-during-render keeps SSR and the first client paint in lock-step so
 * links like `/colors` don't render briefly with stale state.
 *
 * Subscribes to Realtime updates on `brand_repos` for the current `userId` so
 * the dashboard automatically `router.refresh()`es when a scan flips
 * status — no manual reload needed.
 */
export function BrandProvider({
  profile,
  repoSlug,
  userId,
  children,
}: {
  profile: BrandProfile | null;
  repoSlug: string | null;
  userId?: string | null;
  children: React.ReactNode;
}) {
  const resolvedRepoSlug =
    repoSlug ?? (profile ? `${profile.repo.owner}/${profile.repo.name}` : null);

  useBrandStore.setState({
    profile,
    repoSlug: resolvedRepoSlug,
  });

  const router = useRouter();

  React.useEffect(() => {
    if (!userId) return;
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const channel = supabase
      .channel(`brand_repos:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "brand_repos",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          router.refresh();
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
  }, [userId, router]);

  return <ProductTintRoot profile={profile}>{children}</ProductTintRoot>;
}
