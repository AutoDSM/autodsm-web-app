import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the github fetch helper before importing the module under test so the
// module-level import binding is replaced.
vi.mock("@/lib/github/fetch", () => {
  const fetchManyText = vi.fn();
  return { fetchManyText };
});

import { fetchManyText } from "@/lib/github/fetch";
import { inProjectRoot, selectProjectRoot } from "./select-project-root";

const mockedFetch = fetchManyText as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockedFetch.mockReset();
});

describe("selectProjectRoot", () => {
  it("returns null when no package.json exists", async () => {
    const root = await selectProjectRoot("o", "n", "sha", []);
    expect(root).toBeNull();
  });

  it("picks the root package.json for a single-app repo", async () => {
    mockedFetch.mockResolvedValueOnce([
      {
        path: "package.json",
        content: JSON.stringify({
          dependencies: { react: "19", next: "15" },
        }),
      },
    ]);
    const root = await selectProjectRoot(
      "o",
      "n",
      "sha",
      [
        { path: "package.json" },
        { path: "app/page.tsx" },
        { path: "tailwind.config.ts" },
      ],
    );
    expect(root?.projectRoot).toBe("");
    expect(root?.packageJsonPath).toBe("package.json");
  });

  it("prefers the React app workspace in a monorepo", async () => {
    mockedFetch.mockResolvedValueOnce([
      {
        path: "package.json",
        content: JSON.stringify({
          name: "monorepo",
          dependencies: {},
        }),
      },
      {
        path: "apps/web/package.json",
        content: JSON.stringify({
          name: "web",
          dependencies: { react: "19", next: "15" },
        }),
      },
      {
        path: "packages/utils/package.json",
        content: JSON.stringify({ name: "utils" }),
      },
    ]);
    const root = await selectProjectRoot(
      "o",
      "n",
      "sha",
      [
        { path: "package.json" },
        { path: "apps/web/package.json" },
        { path: "apps/web/app/page.tsx" },
        { path: "apps/web/tailwind.config.ts" },
        { path: "packages/utils/package.json" },
      ],
    );
    expect(root?.projectRoot).toBe("apps/web");
  });

  it("skips package.json files inside node_modules", async () => {
    mockedFetch.mockResolvedValueOnce([
      {
        path: "package.json",
        content: JSON.stringify({
          dependencies: { react: "19" },
        }),
      },
    ]);
    const root = await selectProjectRoot(
      "o",
      "n",
      "sha",
      [
        { path: "package.json" },
        { path: "node_modules/foo/package.json" },
        { path: "src/app/page.tsx" },
      ],
    );
    expect(root?.projectRoot).toBe("");
  });
});

describe("inProjectRoot", () => {
  it("matches all paths for empty root", () => {
    const f = inProjectRoot("");
    expect(f("anything")).toBe(true);
  });

  it("matches the root and its descendants", () => {
    const f = inProjectRoot("apps/web");
    expect(f("apps/web")).toBe(true);
    expect(f("apps/web/app/layout.tsx")).toBe(true);
    expect(f("apps/other/package.json")).toBe(false);
  });
});
