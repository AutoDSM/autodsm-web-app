import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Window during which an existing in-flight scan blocks a duplicate POST.
 * After this window we assume the prior run died and let a fresh scan reset
 * the state. Matches the client-side "looks stuck" timeout.
 */
export const SCAN_INFLIGHT_WINDOW_MS = 5 * 60 * 1000;

/**
 * Returns true when a scan was started recently enough that we should not
 * stomp on it with another POST. Uses user_onboarding.last_scan_started_at as
 * the freshness signal because scanLog writes are best-effort and may be
 * missing entirely.
 */
export async function isScanInFlight(
  supabase: SupabaseClient,
  userId: string,
  owner: string,
  name: string,
  now: number = Date.now(),
): Promise<{ inFlight: boolean; status?: string | null; startedAt?: string | null }> {
  const [{ data: repoRow }, { data: onboardingRow }] = await Promise.all([
    supabase
      .from("brand_repos")
      .select("scan_status")
      .eq("user_id", userId)
      .eq("owner", owner)
      .eq("name", name)
      .maybeSingle(),
    supabase
      .from("user_onboarding")
      .select("last_scan_started_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const status = repoRow?.scan_status ?? null;
  const startedAt = onboardingRow?.last_scan_started_at ?? null;

  if (status !== "scanning") return { inFlight: false, status, startedAt };

  if (!startedAt) {
    // Scanning flag without a start timestamp — treat as stale.
    return { inFlight: false, status, startedAt };
  }

  const startedMs = Date.parse(startedAt);
  if (!Number.isFinite(startedMs)) return { inFlight: false, status, startedAt };

  return {
    inFlight: now - startedMs < SCAN_INFLIGHT_WINDOW_MS,
    status,
    startedAt,
  };
}

/**
 * Build a scanLog implementation that mirrors to console + brand_scan_logs.
 * Errors on the brand_scan_logs insert are no longer swallowed silently —
 * they go to console.error so Vercel surfaces them instead of leaving the
 * client polling forever with a frozen progress bar.
 */
export function buildScanLogger(
  supabase: SupabaseClient,
  userId: string,
  scope: "scan" | "refresh",
): (event: string, fields?: Record<string, unknown>) => void {
  return (event, fields) => {
    if (process.env.NODE_ENV === "development") {
      console.info(`[${scope}]`, event, fields ?? "");
    } else {
      console.info(`[${scope}] ${JSON.stringify({ event, ...fields })}`);
    }
    void supabase
      .from("brand_scan_logs")
      .insert({
        event,
        payload: { ...fields, scope, userId },
      })
      .then(
        () => undefined,
        (err) => {
          console.error(
            `[${scope}] brand_scan_logs insert failed:`,
            err instanceof Error ? err.message : err,
          );
        },
      );
  };
}
