import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseScanLogPayload,
  pickLatestScanLogForRepo,
  type ActiveRepoHint,
  type ScanLogRow,
} from "@/lib/scan/scan-status-log";

export const dynamic = "force-dynamic";

const LOG_FETCH_LIMIT = 150;

/**
 * Latest scan phase + repo scan_status for the authenticated user.
 * Supports onboarding polling alongside POST /api/scan (which may run for minutes).
 *
 * Log selection:
 * - Do not use PostgREST `.eq("payload->>userId", …)` — it breaks on many deployments.
 * - Fetch recent rows (RLS limits to this user's visible logs), then pick the newest row
 *   for `payload.userId`, preferring `payload.owner`/`payload.name` when they match the
 *   active repo so phases don’t mix across multiple repositories.
 * - When `repo_id` is present on rows (future inserts), those rows are included in the same
 *   newest-first list and naturally sort ahead when relevant.
 */
export async function GET() {
  try {
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

    let phase: string | null = null;
    let counts: Record<string, number> | null = null;
    let logCreatedAt: string | null = null;

    const { data: logRows, error: logErr } = await supabase
      .from("brand_scan_logs")
      .select("payload, created_at, event, repo_id")
      .order("created_at", { ascending: false })
      .limit(LOG_FETCH_LIMIT);

    if (logErr) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[scan/status] brand_scan_logs query", logErr.message);
      }
    } else {
      const repoHint: ActiveRepoHint =
        repo?.owner && repo?.name
          ? {
              ...(repo.id ? { id: repo.id as string } : {}),
              owner: repo.owner as string,
              name: repo.name as string,
            }
          : null;

      const picked = pickLatestScanLogForRepo(
        (logRows ?? []) as ScanLogRow[],
        user.id,
        repoHint,
      );

      if (picked?.payload) {
        const parsed = parseScanLogPayload(picked.payload);
        phase = parsed.phase;
        counts = parsed.counts;
        logCreatedAt = picked.created_at ?? null;
      }
    }

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
      logCreatedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[scan/status]", message);
    return NextResponse.json(
      { error: "scan_status_failed", message },
      { status: 500 },
    );
  }
}
