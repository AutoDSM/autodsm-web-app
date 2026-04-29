import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRepoScan } from "@/lib/scan/run-repo-scan";
import {
  buildScanLogger,
  isScanInFlight,
} from "@/lib/scan/scan-route-helpers";
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

  const errorToFields = (e: unknown): Record<string, string | undefined> => {
    if (e instanceof Error) {
      return {
        message: e.message?.slice(0, 500),
        name: e.name?.slice(0, 120),
        stack: e.stack?.slice(0, 4000),
      };
    }
    return { message: String(e).slice(0, 500) };
  };

  const profile = (repoRow.brand_profile as BrandProfile | null) ?? null;
  const projectName =
    profile?.meta?.projectName?.trim() || repoRow.name;

  const scanLog = buildScanLogger(supabase, user.id, "refresh");

  const inFlight = await isScanInFlight(
    supabase,
    user.id,
    repoRow.owner,
    repoRow.name,
  );
  if (inFlight.inFlight) {
    return NextResponse.json(
      {
        error: "A scan for this repository is already in progress.",
        errorCode: "scan_in_flight",
        scanStatus: inFlight.status,
        startedAt: inFlight.startedAt,
      },
      { status: 409 },
    );
  }

  const markScanError = async (message: string) => {
    await supabase.from("user_onboarding").upsert(
      { user_id: user.id, last_scan_error: message.slice(0, 500) },
      { onConflict: "user_id" }
    );
    await supabase
      .from("brand_repos")
      .update({ scan_status: "failed" })
      .eq("user_id", user.id)
      .eq("owner", repoRow.owner)
      .eq("name", repoRow.name);
  };

  await supabase.from("brand_repos").upsert(
    {
      user_id: user.id,
      provider: "github",
      owner: repoRow.owner,
      name: repoRow.name,
      is_public: true,
      scan_status: "scanning",
    },
    { onConflict: "user_id,owner,name" },
  );

  await supabase.from("user_onboarding").upsert(
    {
      user_id: user.id,
      last_scan_started_at: new Date().toISOString(),
      last_scan_error: null,
      current_step: "scanning",
    },
    { onConflict: "user_id" }
  );

  let result: Awaited<ReturnType<typeof runRepoScan>>;
  try {
    result = await runRepoScan(supabase, user, session, {
      owner: repoRow.owner,
      name: repoRow.name,
      projectName,
      scanLog,
      markScanError,
    });
  } catch (e) {
    const fields = errorToFields(e);
    scanLog("fatal", { owner: repoRow.owner, name: repoRow.name, ...fields });
    await markScanError(
      "Scan failed unexpectedly. Open the technical details for more info, then try again."
    );
    return NextResponse.json(
      { error: "Scan failed unexpectedly. Please try again.", errorCode: "internal_error" },
      { status: 500 }
    );
  }

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
