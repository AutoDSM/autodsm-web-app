import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildDemoBrandProfile } from "./demo-profile";
import { getDevPreviewRepoSlug, isDevAuthBypassEnabled } from "@/lib/dev/local-preview";
import { isTestDashboardBypassEnabled } from "@/lib/dev/test-dashboard-bypass";
import type { BrandProfile } from "./types";
import { parseStoredProfile } from "./parse-stored-profile";

export interface LoadedBrand {
  repoSlug: string;
  userId: string | null;
  profile: BrandProfile | null;
  status: "pending" | "scanning" | "completed" | "failed" | "unsupported";
  unsupportedReason: string | null;
  /** Last scan error message (user_onboarding), useful when status is `failed`. */
  lastScanError: string | null;
  isPublic: boolean;
}

/** Loads the currently-authenticated user's most recently connected repo. */
export async function loadMyBrand(): Promise<LoadedBrand | null> {
  if (isDevAuthBypassEnabled() || isTestDashboardBypassEnabled()) {
    const slug = getDevPreviewRepoSlug();
    const parts = slug.split("/").filter(Boolean);
    const owner = parts[0] ?? "demo";
    const repoName = parts[1] ?? "local-preview";
    return {
      repoSlug: `${owner}/${repoName}`,
      userId: null,
      profile: buildDemoBrandProfile(owner, repoName),
      status: "completed",
      unsupportedReason: null,
      lastScanError: null,
      isPublic: true,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Honour the user's selected repo (set via the topbar switcher) when set;
  // fall back to the most recently connected repo otherwise.
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("last_repo")
    .eq("user_id", user.id)
    .maybeSingle();
  const lastRepo = ((prefs?.last_repo as string | null) ?? "").trim();
  const lastParts = lastRepo.split("/").filter(Boolean);

  type BrandRepoRow = {
    owner: string;
    name: string;
    brand_profile: unknown;
    scan_status: string | null;
    unsupported_reason: string | null;
    is_public: boolean;
    user_id: string;
  };
  let data: BrandRepoRow | null = null;

  if (lastParts.length === 2) {
    const { data: row } = await supabase
      .from("brand_repos")
      .select("owner,name,brand_profile,scan_status,unsupported_reason,is_public,user_id")
      .eq("user_id", user.id)
      .eq("owner", lastParts[0])
      .eq("name", lastParts[1])
      .maybeSingle();
    if (row) data = row as unknown as BrandRepoRow;
  }

  if (!data) {
    const { data: row } = await supabase
      .from("brand_repos")
      .select("owner,name,brand_profile,scan_status,unsupported_reason,is_public,user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row) data = row as unknown as BrandRepoRow;
  }

  if (!data) return null;

  const status = (data.scan_status as LoadedBrand["status"]) ?? "pending";

  let lastScanError: string | null = null;
  if (status === "failed") {
    const { data: uo } = await supabase
      .from("user_onboarding")
      .select("last_scan_error")
      .eq("user_id", user.id)
      .maybeSingle();
    lastScanError = (uo?.last_scan_error as string | null) ?? null;
  }

  return {
    repoSlug: `${data.owner}/${data.name}`,
    userId: data.user_id,
    profile: parseStoredProfile(data.brand_profile),
    status,
    unsupportedReason: (data.unsupported_reason as string | null) ?? null,
    lastScanError,
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
    profile: parseStoredProfile(data.brand_profile),
    status: (data.scan_status as LoadedBrand["status"]) ?? "pending",
    unsupportedReason: (data.unsupported_reason as string | null) ?? null,
    lastScanError: null,
    isPublic: data.is_public,
  };
}
