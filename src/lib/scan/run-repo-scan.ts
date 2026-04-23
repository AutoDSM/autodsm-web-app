import "server-only";
import {
  type GitHubFetchOptions,
  fetchRepoMeta,
  fetchTree,
  fetchFileText,
  fetchFileBuffer,
} from "@/lib/github/fetch";
import { buildBrandProfile } from "@/lib/extract";
import type { FontFileInput } from "@/lib/extract";
import type { AssetFile } from "@/lib/extract";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { withUploadedAssetUrls } from "./brand-assets-storage";

const MAX_CSS_FILES = 12;
const MAX_LAYOUT_FILES = 6;
const MAX_ASSET_FILES = 80;

interface TreeEntry {
  path: string;
  size: number;
}

function hasTsxOrTs(tree: TreeEntry[]): boolean {
  return tree.some(
    (e) => e.path.endsWith(".tsx") || e.path.endsWith(".ts")
  );
}

function rankCssPath(p: string): number {
  const lp = p.toLowerCase();
  if (/globals\.css$/.test(lp)) return 0;
  if (/app\/.*\.css$/.test(lp)) return 1;
  if (/tailwind.*\.css$/.test(lp)) return 1;
  if (/styles?\/.*\.css$/.test(lp)) return 2;
  if (/src\/.*\.css$/.test(lp)) return 3;
  return 5;
}

export type RunRepoScanResult =
  | { kind: "completed"; owner: string; name: string; durationMs: number }
  | { kind: "error"; status: number; body: object }
  | { kind: "unsupported"; body: { unsupported: string } };

/**
 * Core GitHub fetch + `buildBrandProfile` + `brand_repos` upsert.
 * Used by POST /api/scan and POST /api/scan/refresh.
 */
export async function runRepoScan(
  supabase: SupabaseClient,
  user: User,
  session: Session | null,
  {
    owner,
    name,
    projectName,
    scanLog,
    markScanError,
  }: {
    owner: string;
    name: string;
    projectName: string;
    scanLog: (event: string, fields?: Record<string, string | undefined>) => void;
    markScanError: (message: string) => Promise<void>;
  }
): Promise<RunRepoScanResult> {
  const t0 = Date.now();
  const ghOpts: GitHubFetchOptions = {
    userAccessToken: session?.provider_token ?? null,
  };

  const meta = await fetchRepoMeta(owner, name, ghOpts);
  if (!meta) {
    scanLog("meta_failed", { reason: "not_accessible" });
    await markScanError(
      "Repository not found or not accessible. For private repos, sign in with GitHub (OAuth) or ensure the repo exists."
    );
    return {
      kind: "error",
      status: 404,
      body: {
        error:
          "Repository not found or not accessible. If it is private, use Continue with GitHub and grant repo access.",
        errorCode: "repo_inaccessible",
      },
    };
  }

  const rawTree = await fetchTree(owner, name, meta.sha, ghOpts);
  const tree: TreeEntry[] = rawTree.map((t) => ({
    path: t.path,
    size: t.size,
  }));
  if (tree.length === 0) {
    await markScanError("Repository tree is empty or inaccessible.");
    return {
      kind: "error",
      status: 500,
      body: { error: "Repository tree is empty or inaccessible." },
    };
  }

  const pkgJsonEntry = tree.find(
    (e) => e.path === "package.json" || e.path.endsWith("/package.json")
  );
  if (!pkgJsonEntry) {
    await writeRepoUnsupported(
      supabase,
      user.id,
      meta,
      "no-package-json"
    );
    return { kind: "unsupported", body: { unsupported: "no-package-json" } };
  }

  const pkgSource = await fetchFileText(
    owner,
    name,
    pkgJsonEntry.path,
    meta.sha,
    ghOpts
  );
  if (!pkgSource) {
    await markScanError("Could not read package.json.");
    return {
      kind: "error",
      status: 500,
      body: { error: "Could not read package.json." },
    };
  }
  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  try {
    pkg = JSON.parse(pkgSource);
  } catch {
    await writeRepoUnsupported(
      supabase,
      user.id,
      meta,
      "invalid-package-json"
    );
    return { kind: "unsupported", body: { unsupported: "invalid-package-json" } };
  }
  const allDeps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  };
  const hasReact = "react" in allDeps;
  const hasTs = "typescript" in allDeps || hasTsxOrTs(tree);

  if (!hasReact) {
    await writeRepoUnsupported(supabase, user.id, meta, "no-react");
    return { kind: "unsupported", body: { unsupported: "no-react" } };
  }
  if (!hasTs) {
    await writeRepoUnsupported(
      supabase,
      user.id,
      meta,
      "no-typescript"
    );
    return { kind: "unsupported", body: { unsupported: "no-typescript" } };
  }

  const tailwindEntry = tree.find((e) =>
    /(^|\/)tailwind\.config\.(ts|js|cjs|mjs)$/.test(e.path)
  );
  const tailwindConfigSource = tailwindEntry
    ? (await fetchFileText(
        owner,
        name,
        tailwindEntry.path,
        meta.sha,
        ghOpts
      )) ?? undefined
    : undefined;

  const cssEntries = tree
    .filter(
      (e) =>
        (e.path.endsWith(".css") ||
          e.path.endsWith(".scss") ||
          e.path.endsWith(".sass")) &&
        !e.path.includes("node_modules/") &&
        e.size < 500_000
    )
    .sort((a, b) => rankCssPath(a.path) - rankCssPath(b.path))
    .slice(0, MAX_CSS_FILES);

  const cssSources: Array<{ path: string; content: string }> = [];
  for (const entry of cssEntries) {
    const content = await fetchFileText(
      owner,
      name,
      entry.path,
      meta.sha,
      ghOpts
    );
    if (content) cssSources.push({ path: entry.path, content });
  }

  const shadcnEntry = tree.find(
    (e) => e.path === "components.json" || e.path.endsWith("/components.json")
  );
  const shadcnJson = shadcnEntry
    ? (await fetchFileText(
        owner,
        name,
        shadcnEntry.path,
        meta.sha,
        ghOpts
      )) ?? undefined
    : undefined;

  const layoutCandidates = tree
    .filter((e) =>
      /(^|\/)(app\/layout|app\/_app|pages\/_app|src\/main|src\/app\/layout)\.(ts|tsx|js|jsx)$/.test(
        e.path
      )
    )
    .slice(0, MAX_LAYOUT_FILES);
  const layoutFiles: FontFileInput[] = [];
  for (const entry of layoutCandidates) {
    const content = await fetchFileText(
      owner,
      name,
      entry.path,
      meta.sha,
      ghOpts
    );
    if (content) layoutFiles.push({ path: entry.path, content });
  }

  const assetExtRe = /\.(svg|png|jpe?g|webp|ico|gif)$/i;
  const assetCandidates = tree
    .filter(
      (e) =>
        assetExtRe.test(e.path) &&
        (e.path.startsWith("public/") ||
          e.path.includes("/public/") ||
          e.path.startsWith("src/assets/") ||
          e.path.includes("/src/assets/")) &&
        e.size > 0 &&
        e.size < 2_000_000
    )
    .slice(0, MAX_ASSET_FILES);

  const assetFiles: AssetFile[] = [];
  for (const entry of assetCandidates) {
    const buf = await fetchFileBuffer(
      owner,
      name,
      entry.path,
      meta.sha,
      ghOpts
    );
    if (buf) assetFiles.push({ path: entry.path, buffer: buf });
  }

  let profile: Awaited<ReturnType<typeof buildBrandProfile>>;
  let scanDurationMs = 0;
  try {
    const built = await buildBrandProfile({
      repo: { owner, name, url: meta.url },
      tailwindConfigSource,
      tailwindConfigPath: tailwindEntry?.path,
      cssSources,
      shadcnJson,
      shadcnConfigPath: shadcnEntry?.path,
      assetFiles,
      layoutFiles,
      sha: meta.sha,
      branch: meta.defaultBranch,
      filesScanned:
        cssSources.length +
        layoutFiles.length +
        assetFiles.length +
        (tailwindConfigSource ? 1 : 0) +
        (shadcnJson ? 1 : 0) +
        1,
    });
    scanDurationMs = Date.now() - t0;
    const merged: Awaited<ReturnType<typeof buildBrandProfile>> = {
      ...built,
      meta: {
        ...built.meta,
        projectName,
        lastScanDurationMs: scanDurationMs,
      },
    };
    profile = await withUploadedAssetUrls(
      supabase,
      user.id,
      meta.owner,
      meta.name,
      merged,
      assetFiles
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    scanLog("extraction_failed", { reason: message.slice(0, 120) });
    await markScanError(`Extraction failed: ${message.slice(0, 300)}`);
    return {
      kind: "error",
      status: 500,
      body: { error: `Extraction failed: ${message}` },
    };
  }

  await supabase.from("app_users").upsert(
    {
      id: user.id,
      email: user.email,
      github_login:
        (user.user_metadata?.user_name as string | undefined) ?? null,
      avatar_url:
        (user.user_metadata?.avatar_url as string | undefined) ?? null,
    },
    { onConflict: "id" }
  );

  const { error: upsertErr } = await supabase.from("brand_repos").upsert(
    {
      user_id: user.id,
      owner: meta.owner,
      name: meta.name,
      default_branch: meta.defaultBranch,
      framework: "react-ts",
      last_scanned_sha: meta.sha,
      last_scanned_at: new Date().toISOString(),
      scan_status: "completed",
      unsupported_reason: null,
      brand_profile: profile,
    },
    { onConflict: "user_id,owner,name" }
  );

  if (upsertErr) {
    scanLog("db_upsert_failed", { reason: upsertErr.message });
    await markScanError(upsertErr.message);
    return {
      kind: "error",
      status: 500,
      body: { error: `Save failed: ${upsertErr.message}` },
    };
  }

  await supabase.from("user_onboarding").upsert(
    { user_id: user.id, last_scan_error: null },
    { onConflict: "user_id" }
  );
  scanLog("completed", { owner, name });

  return {
    kind: "completed",
    owner: meta.owner,
    name: meta.name,
    durationMs: scanDurationMs,
  };
}

async function writeRepoUnsupported(
  supabase: SupabaseClient,
  userId: string,
  meta: { owner: string; name: string; defaultBranch: string; sha: string },
  reason: string
): Promise<void> {
  await supabase.from("app_users").upsert({ id: userId }, { onConflict: "id" });
  await supabase.from("brand_repos").upsert(
    {
      user_id: userId,
      owner: meta.owner,
      name: meta.name,
      default_branch: meta.defaultBranch,
      scan_status: "unsupported",
      unsupported_reason: reason,
      last_scanned_sha: meta.sha,
      last_scanned_at: new Date().toISOString(),
    },
    { onConflict: "user_id,owner,name" }
  );
}
