import "server-only";
import {
  type GitHubFetchOptions,
  fetchManyText,
} from "@/lib/github/fetch";

export interface ProjectRootCandidate {
  /** Repo-relative directory containing the chosen package.json (e.g. "" or "apps/web"). */
  projectRoot: string;
  /** Path of the picked package.json (e.g. "package.json" or "apps/web/package.json"). */
  packageJsonPath: string;
  /** Score for debugging / telemetry. */
  score: number;
  /** Parsed package.json (helps the caller skip a re-fetch). */
  pkg: {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
}

interface TreeEntry {
  path: string;
  size?: number;
}

const MAX_PACKAGE_JSON_FILES = 8;
const REACT_DEPS = ["react", "next", "@remix-run/react", "vite"];

function dirOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function depth(path: string): number {
  if (!path) return 0;
  return path.split("/").length;
}

/**
 * Pick the most likely React/TypeScript project root in a (possibly monorepo)
 * tree. Scoring favors:
 *
 *  - Has `react` / `next` / Remix / Vite in deps (+10 each match)
 *  - Sibling `app/`, `src/`, or `pages/` directory exists in the tree (+3)
 *  - Sibling `tailwind.config.*` exists (+3)
 *  - Shallow path wins ties (`-depth`)
 *
 * Returns `null` when no `package.json` looks React-y.
 */
export async function selectProjectRoot(
  owner: string,
  name: string,
  ref: string,
  tree: TreeEntry[],
  opts?: GitHubFetchOptions,
): Promise<ProjectRootCandidate | null> {
  const pkgEntries = tree
    .filter(
      (e) =>
        (e.path === "package.json" || e.path.endsWith("/package.json")) &&
        !e.path.includes("node_modules/") &&
        !e.path.includes(".turbo/"),
    )
    .sort((a, b) => depth(a.path) - depth(b.path))
    .slice(0, MAX_PACKAGE_JSON_FILES);

  if (pkgEntries.length === 0) return null;

  const fetched = await fetchManyText(
    owner,
    name,
    pkgEntries.map((e) => e.path),
    ref,
    opts,
    Math.min(6, pkgEntries.length),
  );

  let best: ProjectRootCandidate | null = null;

  for (const { path, content } of fetched) {
    if (!content) continue;
    let parsed: ProjectRootCandidate["pkg"];
    try {
      parsed = JSON.parse(content);
    } catch {
      continue;
    }

    const allDeps = {
      ...(parsed.dependencies ?? {}),
      ...(parsed.devDependencies ?? {}),
      ...(parsed.peerDependencies ?? {}),
    };

    let score = 0;
    for (const dep of REACT_DEPS) {
      if (dep in allDeps) score += 10;
    }
    if (!("react" in allDeps)) {
      // Without react this is almost never the right project root.
      continue;
    }

    const root = dirOf(path);
    const sibling = (sub: string) =>
      tree.some((e) =>
        root === ""
          ? e.path === sub || e.path.startsWith(`${sub}/`)
          : e.path.startsWith(`${root}/${sub}/`) || e.path === `${root}/${sub}`,
      );

    if (sibling("app") || sibling("src") || sibling("pages")) score += 3;
    if (
      tree.some((e) =>
        root === ""
          ? /^tailwind\.config\.(ts|js|cjs|mjs)$/.test(e.path)
          : e.path === `${root}/tailwind.config.ts` ||
            e.path === `${root}/tailwind.config.js` ||
            e.path === `${root}/tailwind.config.cjs` ||
            e.path === `${root}/tailwind.config.mjs`,
      )
    ) {
      score += 3;
    }
    score -= depth(root);

    if (!best || score > best.score) {
      best = { projectRoot: root, packageJsonPath: path, score, pkg: parsed };
    }
  }

  return best;
}

/**
 * Build a path filter that matches files under the given project root. Empty
 * string root matches the entire repo.
 */
export function inProjectRoot(projectRoot: string): (path: string) => boolean {
  if (!projectRoot) return () => true;
  const prefix = `${projectRoot}/`;
  return (p) => p === projectRoot || p.startsWith(prefix);
}
