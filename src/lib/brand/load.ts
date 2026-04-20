import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BrandProfile } from "./types";

export interface LoadedBrand {
  repoSlug: string;
  userId: string | null;
  profile: BrandProfile | null;
  status: "pending" | "scanning" | "completed" | "failed" | "unsupported";
  unsupportedReason: string | null;
  isPublic: boolean;
}

/** Loads the currently-authenticated user's most recently connected repo. */
export async function loadMyBrand(): Promise<LoadedBrand | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("brand_repos")
    .select("owner,name,brand_profile,scan_status,unsupported_reason,is_public,user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    repoSlug: `${data.owner}/${data.name}`,
    userId: data.user_id,
    profile: (data.brand_profile as BrandProfile | null) ?? null,
    status: (data.scan_status as LoadedBrand["status"]) ?? "pending",
    unsupportedReason: (data.unsupported_reason as string | null) ?? null,
    isPublic: data.is_public,
  };
}

/** Loads a public brand book by owner+repo. Returns null if private or not found. */
export async function loadPublicBrand(
  owner: string,
  repo: string,
): Promise<LoadedBrand | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_repos")
    .select("owner,name,brand_profile,scan_status,unsupported_reason,is_public,user_id")
    .eq("owner", owner)
    .eq("name", repo)
    .eq("is_public", true)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    repoSlug: `${data.owner}/${data.name}`,
    userId: data.user_id,
    profile: (data.brand_profile as BrandProfile | null) ?? null,
    status: (data.scan_status as LoadedBrand["status"]) ?? "pending",
    unsupportedReason: (data.unsupported_reason as string | null) ?? null,
    isPublic: data.is_public,
  };
}
