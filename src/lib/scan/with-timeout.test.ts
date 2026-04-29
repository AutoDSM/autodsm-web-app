import { describe, expect, it } from "vitest";
import { ScanPhaseTimeoutError, withTimeout } from "./with-timeout";

describe("withTimeout", () => {
  it("resolves when the task finishes before the deadline", async () => {
    const fast = new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 5));
    await expect(withTimeout(fast, 200, "demo")).resolves.toBe("ok");
  });

  it("rejects with ScanPhaseTimeoutError once the deadline is exceeded", async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 100));
    await expect(withTimeout(slow, 10, "fetch_tree")).rejects.toBeInstanceOf(
      ScanPhaseTimeoutError,
    );
  });

  it("propagates rejection from the underlying task", async () => {
    const failing = Promise.reject(new Error("upstream-down"));
    await expect(withTimeout(failing, 200, "build_profile")).rejects.toThrow(
      "upstream-down",
    );
  });
});
