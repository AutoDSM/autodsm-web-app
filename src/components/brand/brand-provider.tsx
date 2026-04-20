"use client";

import { useBrandStore } from "@/stores/brand";
import type { BrandProfile } from "@/lib/brand/types";

/**
 * Hydrates the client-side brand store with server-fetched props.
 * Sync runs during render (not only in an effect) so SSR and the first client
 * paint see the same profile/repoSlug — otherwise links like `/colors` could
 * render until hydration and cause real 404s on the public brand book.
 */
export function BrandProvider({
  profile,
  repoSlug,
  children,
}: {
  profile: BrandProfile | null;
  repoSlug: string | null;
  children: React.ReactNode;
}) {
  const resolvedRepoSlug =
    repoSlug ?? (profile ? `${profile.repo.owner}/${profile.repo.name}` : null);

  useBrandStore.setState({
    profile,
    repoSlug: resolvedRepoSlug,
  });

  return <>{children}</>;
}
