import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRepoScan } from "@/lib/scan/run-repo-scan";
import type { BrandProfile } from "@/lib/brand/types";

export const runtime = "nodejs";
// Refresh re-runs the inline scan; same 300s budget as POST /api/scan.
export const maxDuration = 300;

/**
 * POST /api/scan/refresh
 * Re-runs the extraction for the user’s most recently connected repository
 * (latest `brand_repos` row by `created_at`, matching `loadMyBrand`).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: repoRow, error: repoErr } = await supabase
    .from("brand_repos")
    .select("owner,name,brand_profile")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (repoErr) {
    return NextResponse.json(
      { error: "Could not load repository: " + repoErr.message },
      { status: 500 }
    );
  }
  if (!repoRow?.owner || !repoRow.name) {
    return NextResponse.json(
      { error: "No connected repository. Connect a repo from onboarding first." },
      { status: 400 }
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const profile = (repoRow.brand_profile as BrandProfile | null) ?? null;
  const projectName =
    profile?.meta?.projectName?.trim() || repoRow.name;

  const scanLog = (event: string, fields?: Record<string, string | undefined>) => {
    if (process.env.NODE_ENV === "development") {
      console.info("[scan/refresh]", event, fields ?? "");
    } else {
      console.info(`[scan/refresh] ${JSON.stringify({ event, ...fields })}`);
    }
    void supabase
      .from("brand_scan_logs")
      .insert({
        event,
        payload: { ...fields, scope: "refresh", userId: user.id },
      })
      .then(() => undefined, () => undefined);
  };

  const markScanError = async (message: string) => {
    await supabase.from("user_onboarding").upsert(
      { user_id: user.id, last_scan_error: message.slice(0, 500) },
      { onConflict: "user_id" }
    );
  };

  await supabase.from("user_onboarding").upsert(
    {
      user_id: user.id,
      last_scan_started_at: new Date().toISOString(),
      last_scan_error: null,
      current_step: "scanning",
    },
    { onConflict: "user_id" }
  );

  const result = await runRepoScan(supabase, user, session, {
    owner: repoRow.owner,
    name: repoRow.name,
    projectName,
    scanLog,
    markScanError,
  });

  if (result.kind === "error") {
    return NextResponse.json(result.body, { status: result.status });
  }
  if (result.kind === "unsupported") {
    return NextResponse.json({ ...result.body, refreshed: false }, { status: 200 });
  }
  return NextResponse.json({
    status: "completed",
    owner: result.owner,
    name: result.name,
    durationMs: result.durationMs,
  });
}
