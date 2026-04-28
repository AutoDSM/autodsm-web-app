import "server-only";
import {
  type GitHubFetchOptions,
  fetchManyBuffer,
  fetchManyText,
  fetchRepoMetaDetailed,
  fetchTree,
} from "@/lib/github/fetch";
import { resolveGitHubAuth } from "@/lib/github/auth";
import { buildBrandProfile } from "@/lib/extract";
import type { FontFileInput } from "@/lib/extract";
import type { AssetFile } from "@/lib/extract";
import type { BrandProfile } from "@/lib/brand/types";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { withUploadedAssetUrls } from "./brand-assets-storage";
import { selectProjectRoot } from "./select-project-root";

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

/**
 * Sort assets so the most likely brand logos / Next.js icon conventions land
 * before the noise (random PNGs, screenshots, …) and survive the
 * `MAX_ASSET_FILES` slice.
 */
function profileTokenCounts(profile: BrandProfile): Record<string, number> {
  return {
    colors: profile.colors.length,
    typography: profile.typography.length,
    fonts: profile.fonts.length,
    spacing: profile.spacing.length,
    shadows: profile.shadows.length,
    radii: profile.radii.length,
    borders: profile.borders.length,
    animations: profile.animations.length,
    breakpoints: profile.breakpoints.length,
    opacity: profile.opacity.length,
    zIndex: profile.zIndex.length,
    gradients: profile.gradients.length,
    assets: profile.assets.length,
  };
}

function rankAssetPath(p: string): number {
  const lp = p.toLowerCase();
  if (/(^|\/)logo[^/]*\.(svg|png|webp)$/.test(lp)) return 0;
  if (/(^|\/)wordmark[^/]*\.(svg|png|webp)$/.test(lp)) return 0;
  if (/(^|\/)brand[^/]*\.(svg|png|webp)$/.test(lp)) return 1;
  if (/(^|\/)app\/(icon|apple-icon|favicon|opengraph-image|twitter-image)\b/.test(lp)) return 1;
  if (/(^|\/)favicon\.(ico|png|svg)$/.test(lp)) return 2;
  if (/\.svg$/.test(lp)) return 3;
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
    scanLog: (event: string, fields?: Record<string, unknown>) => void;
    markScanError: (message: string) => Promise<void>;
  }
): Promise<RunRepoScanResult> {
  const t0 = Date.now();

  const auth = await resolveGitHubAuth(
    supabase,
    owner,
    name,
    session?.provider_token ?? null,
  );
  scanLog("auth_resolved", { source: auth.source, phase: "fetch_meta", ok: true });
  const ghOpts: GitHubFetchOptions = { auth };

  const metaResult = await fetchRepoMetaDetailed(owner, name, ghOpts);
  if (!metaResult.meta) {
    const code = metaResult.error;
    scanLog("meta_failed", { reason: code, phase: "fetch_meta", ok: false });
    if (code === "rate_limited") {
      await markScanError(
        "GitHub rate limit hit. Try again in a few minutes, or sign in with GitHub for a higher quota."
      );
      return {
        kind: "error",
        status: 429,
        body: {
          error: "GitHub rate limit hit. Try again shortly.",
          errorCode: "rate_limited",
        },
      };
    }
    if (code === "unauthorized" || code === "forbidden") {
      await markScanError(
        "Couldn't access this repository. Reconnect with GitHub or install the autoDSM app on the org."
      );
      return {
        kind: "error",
        status: 401,
        body: {
          error: "Couldn't access this repository.",
          errorCode: "repo_inaccessible",
          needsGitHubReauth: true,
        },
      };
    }
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
  const meta = metaResult.meta;

  scanLog("phase", { phase: "fetch_tree", ok: true });

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

  const root = await selectProjectRoot(owner, name, meta.sha, tree, ghOpts);
  if (!root) {
    await writeRepoUnsupported(supabase, user.id, meta, "no-react");
    return { kind: "unsupported", body: { unsupported: "no-react" } };
  }
  scanLog("project_root", {
    root: root.projectRoot || "<repo-root>",
    phase: "fetch_tree",
    ok: true,
  });

  const projectRoot = root.projectRoot;
  const rootPrefix = projectRoot ? `${projectRoot}/` : "";
  const inRoot = (p: string): boolean =>
    !projectRoot ? true : p === projectRoot || p.startsWith(rootPrefix);

  const allDeps = {
    ...(root.pkg.dependencies ?? {}),
    ...(root.pkg.devDependencies ?? {}),
    ...(root.pkg.peerDependencies ?? {}),
  };
  const hasReact = "react" in allDeps;
  const hasTs = "typescript" in allDeps || hasTsxOrTs(tree.filter((e) => inRoot(e.path)));

  if (!hasReact) {
    await writeRepoUnsupported(supabase, user.id, meta, "no-react");
    return { kind: "unsupported", body: { unsupported: "no-react" } };
  }
  if (!hasTs) {
    await writeRepoUnsupported(supabase, user.id, meta, "no-typescript");
    return { kind: "unsupported", body: { unsupported: "no-typescript" } };
  }

  const tailwindEntry = tree.find(
    (e) =>
      inRoot(e.path) &&
      /(^|\/)tailwind\.config\.(ts|js|cjs|mjs)$/.test(e.path),
  );

  const cssEntries = tree
    .filter(
      (e) =>
        inRoot(e.path) &&
        (e.path.endsWith(".css") ||
          e.path.endsWith(".scss") ||
          e.path.endsWith(".sass")) &&
        !e.path.includes("node_modules/") &&
        e.size < 500_000
    )
    .sort((a, b) => rankCssPath(a.path) - rankCssPath(b.path))
    .slice(0, MAX_CSS_FILES);

  const shadcnEntry = tree.find(
    (e) =>
      inRoot(e.path) &&
      (e.path === "components.json" || e.path.endsWith("/components.json")),
  );

  // Layout/font sources include both Next App Router and a few common Vite/React patterns,
  // optionally rooted under the project root. Allow `(group)` and `[locale]` segments.
  const segment = "[A-Za-z0-9_\\-\\(\\)\\[\\]]+";
  const layoutRe = new RegExp(
    `^${rootPrefix.replace(/\//g, "\\/")}(?:src\\/)?` +
      `(?:` +
      `(?:app(?:\\/${segment})*\\/(?:layout|page|template))` +
      `|(?:pages\\/(?:_app|_document|index))` +
      `|(?:main|index)` +
      `|(?:app)` +
      `)\\.(?:ts|tsx|js|jsx)$`,
  );
  const layoutCandidates = tree
    .filter((e) => inRoot(e.path) && layoutRe.test(e.path))
    .slice(0, MAX_LAYOUT_FILES);

  const assetExtRe = /\.(svg|png|jpe?g|webp|ico|gif)$/i;
  const assetCandidates = tree
    .filter((e) => {
      if (!inRoot(e.path)) return false;
      if (!assetExtRe.test(e.path)) return false;
      if (e.size <= 0 || e.size >= 2_000_000) return false;
      const lp = e.path.toLowerCase();
      const inAssetDir =
        lp.includes("/public/") ||
        lp.startsWith("public/") ||
        lp.includes("/src/assets/") ||
        lp.startsWith("src/assets/") ||
        lp.includes("/assets/") ||
        lp.includes("/images/") ||
        lp.includes("/img/") ||
        lp.includes("/media/") ||
        lp.includes("/static/") ||
        lp.includes("/branding/") ||
        // Next.js root icon conventions (app/icon.png, app/favicon.ico, …)
        /(^|\/)app\/(icon|apple-icon|favicon|opengraph-image|twitter-image)/.test(lp);
      return inAssetDir;
    })
    .sort((a, b) => rankAssetPath(a.path) - rankAssetPath(b.path))
    .slice(0, MAX_ASSET_FILES);

  // Parallel fetches: tailwind config, components.json, all CSS, all layouts,
  // and all asset buffers.
  const textPaths: string[] = [];
  if (tailwindEntry) textPaths.push(tailwindEntry.path);
  if (shadcnEntry) textPaths.push(shadcnEntry.path);
  textPaths.push(...cssEntries.map((e) => e.path));
  textPaths.push(...layoutCandidates.map((e) => e.path));

  const [textResults, bufResults] = await Promise.all([
    fetchManyText(owner, name, textPaths, meta.sha, ghOpts, 6),
    fetchManyBuffer(
      owner,
      name,
      assetCandidates.map((e) => e.path),
      meta.sha,
      ghOpts,
      6,
    ),
  ]);

  const textByPath = new Map<string, string | null>();
  for (const r of textResults) textByPath.set(r.path, r.content);

  const tailwindConfigSource = tailwindEntry
    ? textByPath.get(tailwindEntry.path) ?? undefined
    : undefined;
  const shadcnJson = shadcnEntry
    ? textByPath.get(shadcnEntry.path) ?? undefined
    : undefined;
  const cssSources: Array<{ path: string; content: string }> = [];
  for (const entry of cssEntries) {
    const content = textByPath.get(entry.path);
    if (content) cssSources.push({ path: entry.path, content });
  }
  const layoutFiles: FontFileInput[] = [];
  for (const entry of layoutCandidates) {
    const content = textByPath.get(entry.path);
    if (content) layoutFiles.push({ path: entry.path, content });
  }

  const assetFiles: AssetFile[] = [];
  for (const r of bufResults) {
    if (r.buffer) assetFiles.push({ path: r.path, buffer: r.buffer });
  }

  scanLog("phase", { phase: "fetch_css", ok: true, cssFiles: cssSources.length });
  scanLog("phase", { phase: "fetch_layouts", ok: true, layoutFiles: layoutFiles.length });
  scanLog("phase", { phase: "fetch_assets", ok: true, assetFiles: assetFiles.length });

  scanLog("phase", { phase: "build_profile", ok: true, stage: "start" });

  let profile: Awaited<ReturnType<typeof buildBrandProfile>>;
  let scanDurationMs = 0;
  try {
    const built = await buildBrandProfile({
      repo: { owner, name, url: meta.url },
      tailwindConfigSource: tailwindConfigSource ?? undefined,
      tailwindConfigPath: tailwindEntry?.path,
      cssSources,
      shadcnJson: shadcnJson ?? undefined,
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
        projectRoot,
      },
    };
    scanLog("phase", {
      phase: "build_profile",
      ok: true,
      durationMs: scanDurationMs,
      counts: profileTokenCounts(merged),
    });

    profile = await withUploadedAssetUrls(
      supabase,
      user.id,
      meta.owner,
      meta.name,
      merged,
      assetFiles
    );

    scanLog("phase", { phase: "upload_assets", ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const friendly = friendlyExtractionError(message);
    scanLog("extraction_failed", {
      reason: message.slice(0, 120),
      friendly,
      phase: "build_profile",
      ok: false,
    });
    await markScanError(friendly);
    return {
      kind: "error",
      status: 500,
      body: { error: friendly, errorCode: "extraction_failed" },
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
      project_root: projectRoot || null,
      tint_hex: profile.meta?.tintHex ?? null,
      primary_logo_path: profile.meta?.primaryLogoPath ?? null,
      assets_storage_warning: profile.meta?.assetsStorageWarning ?? null,
      extractor_version: profile.meta?.extractorVersion ?? null,
    },
    { onConflict: "user_id,owner,name" }
  );

  if (upsertErr) {
    scanLog("db_upsert_failed", {
      reason: upsertErr.message,
      phase: "save",
      ok: false,
    });
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
  scanLog("phase", { phase: "save", ok: true });
  scanLog("completed", { owner, name, phase: "done", ok: true });

  return {
    kind: "completed",
    owner: meta.owner,
    name: meta.name,
    durationMs: scanDurationMs,
  };
}

/**
 * Map raw extractor / dependency errors to a short, user-friendly sentence
 * shown on the dashboard banner. Falls back to a truncated raw message so we
 * still surface something useful in unfamiliar cases.
 */
function friendlyExtractionError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("unexpected token") || lower.includes("babel"))
    return "We couldn't parse one of your config files. Run a build locally to confirm syntax, then rescan.";
  if (lower.includes("sharp") || lower.includes("vips"))
    return "An image asset couldn't be decoded. Re-export the asset (PNG/WebP) and rescan.";
  if (lower.includes("rate limit") || lower.includes("rate-limited") || lower.includes("403"))
    return "GitHub rate limit hit during the scan. Try again in a few minutes.";
  if (lower.includes("not found") || lower.includes("404"))
    return "Some files referenced by the project couldn't be fetched from GitHub. Try rescanning.";
  if (lower.includes("bucket"))
    return "Brand asset Storage isn't configured yet. Tokens were extracted but logos/images aren't uploaded.";
  return `Extraction failed: ${raw.slice(0, 240)}`;
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
