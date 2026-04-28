import { describe, expect, it } from "vitest";
import { pickLatestScanLogForRepo } from "./scan-status-log";

describe("pickLatestScanLogForRepo", () => {
  const uid = "user-1";

  it("returns undefined when no rows match userId", () => {
    expect(
      pickLatestScanLogForRepo(
        [{ payload: { userId: "other" }, created_at: "2025-01-01" }],
        uid,
        { owner: "a", name: "b" },
      ),
    ).toBeUndefined();
  });

  it("prefers owner/name match when multiple scans exist", () => {
    const rows = [
      {
        payload: { userId: uid, phase: "save", owner: "foo", name: "bar" },
        created_at: "2025-01-03",
      },
      {
        payload: { userId: uid, phase: "fetch_meta", owner: "acme", name: "web" },
        created_at: "2025-01-02",
      },
    ];
    const picked = pickLatestScanLogForRepo(rows, uid, {
      owner: "acme",
      name: "web",
    });
    expect((picked?.payload as { phase?: string }).phase).toBe("fetch_meta");
  });

  it("prefers repo_id match when present", () => {
    const rows = [
      {
        repo_id: "other-id",
        payload: { userId: uid, phase: "done" },
        created_at: "2025-01-03",
      },
      {
        repo_id: "repo-a",
        payload: { userId: uid, phase: "fetch_tree" },
        created_at: "2025-01-02",
      },
    ];
    const picked = pickLatestScanLogForRepo(rows, uid, {
      id: "repo-a",
      owner: "o",
      name: "n",
    });
    expect((picked?.payload as { phase?: string }).phase).toBe("fetch_tree");
  });

  it("falls back to latest userId-only row when slug not in payload", () => {
    const rows = [
      { payload: { userId: uid, phase: "build_profile" }, created_at: "2025-01-02" },
      { payload: { userId: uid, phase: "fetch_meta" }, created_at: "2025-01-01" },
    ];
    const picked = pickLatestScanLogForRepo(rows, uid, { owner: "x", name: "y" });
    expect((picked?.payload as { phase?: string }).phase).toBe("build_profile");
  });
});
