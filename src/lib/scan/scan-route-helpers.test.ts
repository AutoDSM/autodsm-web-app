import { describe, expect, it, vi } from "vitest";
import { isScanInFlight, SCAN_INFLIGHT_WINDOW_MS } from "./scan-route-helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

function fakeSupabase(repoRow: unknown, onboardingRow: unknown): SupabaseClient {
  const builder = (row: unknown) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row }),
  });
  const calls: Record<string, unknown> = {
    brand_repos: repoRow,
    user_onboarding: onboardingRow,
  };
  return {
    from: (table: string) => builder(calls[table]),
  } as unknown as SupabaseClient;
}

describe("isScanInFlight", () => {
  it("returns false when no brand_repos row exists", async () => {
    const sb = fakeSupabase(null, null);
    const r = await isScanInFlight(sb, "u1", "owner", "repo");
    expect(r.inFlight).toBe(false);
  });

  it("returns false when status is not scanning", async () => {
    const sb = fakeSupabase({ scan_status: "completed" }, { last_scan_started_at: new Date().toISOString() });
    const r = await isScanInFlight(sb, "u1", "owner", "repo");
    expect(r.inFlight).toBe(false);
  });

  it("returns true when scanning and recently started", async () => {
    const startedAt = new Date(Date.now() - 60_000).toISOString();
    const sb = fakeSupabase({ scan_status: "scanning" }, { last_scan_started_at: startedAt });
    const r = await isScanInFlight(sb, "u1", "owner", "repo");
    expect(r.inFlight).toBe(true);
  });

  it("returns false when scanning but stale (older than the window)", async () => {
    const startedAt = new Date(Date.now() - SCAN_INFLIGHT_WINDOW_MS - 1000).toISOString();
    const sb = fakeSupabase({ scan_status: "scanning" }, { last_scan_started_at: startedAt });
    const r = await isScanInFlight(sb, "u1", "owner", "repo");
    expect(r.inFlight).toBe(false);
  });

  it("returns false when scanning but no last_scan_started_at exists", async () => {
    const sb = fakeSupabase({ scan_status: "scanning" }, { last_scan_started_at: null });
    const r = await isScanInFlight(sb, "u1", "owner", "repo");
    expect(r.inFlight).toBe(false);
  });
});
