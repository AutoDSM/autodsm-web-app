import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Latest scan phase + repo scan_status for the authenticated user.
 * Supports onboarding polling alongside POST /api/scan (which may run for minutes).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: repo } = await supabase
    .from("brand_repos")
    .select("id,owner,name,scan_status,last_scanned_at,unsupported_reason")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: ob } = await supabase
    .from("user_onboarding")
    .select("last_scan_error")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: logRows, error: logErr } = await supabase
    .from("brand_scan_logs")
    .select("payload, created_at, event")
    .eq("payload->>userId", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (logErr && process.env.NODE_ENV === "development") {
    console.warn("[scan/status] brand_scan_logs query", logErr.message);
  }

  const latestPayload = logRows?.[0]?.payload as Record<string, unknown> | undefined;
  const phase =
    typeof latestPayload?.phase === "string" ? latestPayload.phase : null;

  const countsRaw = latestPayload?.counts;
  const counts =
    countsRaw && typeof countsRaw === "object" && countsRaw !== null && !Array.isArray(countsRaw)
      ? (countsRaw as Record<string, number>)
      : null;

  return NextResponse.json({
    repoId: repo?.id ?? null,
    owner: repo?.owner ?? null,
    name: repo?.name ?? null,
    scanStatus: (repo?.scan_status as string | null) ?? null,
    unsupportedReason: (repo?.unsupported_reason as string | null) ?? null,
    lastScannedAt: (repo?.last_scanned_at as string | null) ?? null,
    phase,
    lastScanError: (ob?.last_scan_error as string | null) ?? null,
    counts,
    logCreatedAt: logRows?.[0]?.created_at ?? null,
  });
}
