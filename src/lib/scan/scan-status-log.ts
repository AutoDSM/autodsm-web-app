/**
 * Helpers for GET /api/scan/status — brand_scan_logs rows may omit repo_id during
 * an active scan; payload always includes userId (and owner/name on many events).
 */

export type ScanLogRow = {
  payload: unknown;
  created_at: string;
  event?: string | null;
  repo_id?: string | null;
};

export function parseScanLogPayload(payload: unknown): {
  phase: string | null;
  counts: Record<string, number> | null;
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { phase: null, counts: null };
  }
  const p = payload as Record<string, unknown>;
  const phase = typeof p.phase === "string" ? p.phase : null;

  const countsRaw = p.counts;
  const counts =
    countsRaw &&
    typeof countsRaw === "object" &&
    countsRaw !== null &&
    !Array.isArray(countsRaw)
      ? (countsRaw as Record<string, number>)
      : null;

  return { phase, counts };
}

/** Active `brand_repos` row; `id` enables matching `brand_scan_logs.repo_id` when set. */
export type ActiveRepoHint =
  | null
  | {
      id?: string;
      owner: string;
      name: string;
    };

/**
 * Rows must be ordered newest-first. Picks the latest log for this user's scan:
 * 1. Prefer `repo_id` matching the active `brand_repos` row when present on logs.
 * 2. Else prefer payload `owner`/`name` matching the active repo (when set on events).
 * 3. Else latest row with `payload.userId` (scan payloads always include this).
 */
export function pickLatestScanLogForRepo(
  rows: ScanLogRow[],
  userId: string,
  repo: ActiveRepoHint,
): ScanLogRow | undefined {
  const mine = rows.filter((r) => {
    const p = r.payload as { userId?: string } | null;
    return p?.userId === userId;
  });
  if (mine.length === 0) return undefined;

  if (repo?.id) {
    const byRepoPk = mine.find((r) => r.repo_id === repo.id);
    if (byRepoPk) return byRepoPk;
  }

  if (repo?.owner && repo?.name) {
    const forSlug = mine.find((r) => {
      const p = r.payload as { owner?: string; name?: string } | null;
      return p?.owner === repo.owner && p?.name === repo.name;
    });
    if (forSlug) return forSlug;
  }

  return mine[0];
}
