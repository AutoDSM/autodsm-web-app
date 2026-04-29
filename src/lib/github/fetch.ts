import "server-only";

import type { GitHubAuthSource, ResolvedGitHubAuth } from "./auth";

export interface RepoMeta {
  owner: string;
  name: string;
  defaultBranch: string;
  sha: string; // HEAD SHA of default branch
  url: string;
  private: boolean;
}

export interface RepoFile {
  path: string;
  sha: string;
  size: number;
  /** Utf-8 text content — null for binary / too-large files (> 1 MB). */
  content: string | null;
  /** Raw buffer if downloaded (small binaries only, for asset processing). */
  buffer?: Buffer | null;
}

const MAX_TEXT_SIZE = 1_000_000; // 1MB
const MAX_BINARY_SIZE = 2_000_000; // 2MB

export type GitHubFetchOptions = {
  /**
   * Resolved credential from `resolveGitHubAuth(...)`. Optional for backwards
   * compatibility — when omitted, requests fall back to anonymous + PAT.
   */
  auth?: ResolvedGitHubAuth | null;

  /**
   * Legacy: user OAuth token from Supabase session. Prefer passing `auth`.
   * @deprecated use `auth` instead.
   */
  userAccessToken?: string | null;
};

function pickToken(opts?: GitHubFetchOptions): {
  token: string | null;
  source: GitHubAuthSource;
} {
  if (opts?.auth) return { token: opts.auth.token, source: opts.auth.source };
  if (opts?.userAccessToken) return { token: opts.userAccessToken, source: "oauth" };
  if (process.env.GITHUB_API_TOKEN) {
    return { token: process.env.GITHUB_API_TOKEN, source: "pat" };
  }
  return { token: null, source: "anon" };
}

function apiHeaders(opts?: GitHubFetchOptions): HeadersInit {
  const { token } = pickToken(opts);
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "autoDSM/0.1",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function rawHeaders(opts?: GitHubFetchOptions): HeadersInit {
  const { token } = pickToken(opts);
  const h: Record<string, string> = { "User-Agent": "autoDSM/0.1" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function encPath(p: string): string {
  return p
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
}

/**
 * Single retry on transient GitHub failures (5xx, 429). Network throws also
 * retry once. Hot loops on a flaky upstream are guarded by the per-phase
 * `withTimeout` deadlines in run-repo-scan; this just smooths over a single
 * blip without failing the whole scan.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 1,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      const transient =
        res.status === 429 || (res.status >= 500 && res.status < 600);
      if (!transient || attempt === retries) return res;
    } catch (err) {
      if (attempt === retries) throw err;
    }
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
  }
  // Unreachable: loop either returns or throws.
  return fetch(url, init);
}

/**
 * Standardized error code for upstream GitHub failures so callers can show
 * actionable UX (e.g. reconnect, wait for rate limit reset).
 */
export type GitHubErrorCode =
  | "ok"
  | "not_found"
  | "forbidden"
  | "rate_limited"
  | "unauthorized"
  | "network";

export function classifyGitHubResponse(res: Response): GitHubErrorCode {
  if (res.ok) return "ok";
  if (res.status === 401) return "unauthorized";
  if (res.status === 404) return "not_found";
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") return "rate_limited";
    return "forbidden";
  }
  return "network";
}

/** GET /repos/{o}/{n}/contents/{path} for file/blob at ref (private-safe). */
async function fetchFileContentsApi(
  owner: string,
  name: string,
  path: string,
  ref: string,
  opts?: GitHubFetchOptions,
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${name}/contents/${encPath(path)}?ref=${encodeURIComponent(ref)}`;
  const res = await fetchWithRetry(url, { headers: apiHeaders(opts), next: { revalidate: 0 } });
  if (!res.ok) return null;
  const j = (await res.json()) as { content?: string; encoding?: string; size?: number };
  if (j.encoding !== "base64" || !j.content) return null;
  if (j.size && j.size > MAX_TEXT_SIZE) return null;
  try {
    const buf = Buffer.from(j.content.replace(/\n/g, ""), "base64");
    if (buf.byteLength > MAX_TEXT_SIZE) return null;
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  } catch {
    return null;
  }
}

export interface FetchRepoMetaResult {
  meta: RepoMeta | null;
  error: GitHubErrorCode;
}

export async function fetchRepoMetaDetailed(
  owner: string,
  name: string,
  opts?: GitHubFetchOptions,
): Promise<FetchRepoMetaResult> {
  const res = await fetchWithRetry(`https://api.github.com/repos/${owner}/${name}`, {
    headers: apiHeaders(opts),
    next: { revalidate: 60 },
  });
  const code = classifyGitHubResponse(res);
  if (code !== "ok") return { meta: null, error: code };

  const j = (await res.json()) as {
    default_branch: string;
    html_url: string;
    private: boolean;
  };

  const branchRes = await fetchWithRetry(
    `https://api.github.com/repos/${owner}/${name}/branches/${encodeURIComponent(j.default_branch)}`,
    { headers: apiHeaders(opts) },
  );
  const branchCode = classifyGitHubResponse(branchRes);
  if (branchCode !== "ok") return { meta: null, error: branchCode };
  const branchData = (await branchRes.json()) as { commit: { sha: string } };

  return {
    meta: {
      owner,
      name,
      defaultBranch: j.default_branch,
      sha: branchData.commit.sha,
      url: j.html_url,
      private: j.private,
    },
    error: "ok",
  };
}

export async function fetchRepoMeta(
  owner: string,
  name: string,
  opts?: GitHubFetchOptions,
): Promise<RepoMeta | null> {
  return (await fetchRepoMetaDetailed(owner, name, opts)).meta;
}

export async function fetchTree(
  owner: string,
  name: string,
  sha: string,
  opts?: GitHubFetchOptions,
): Promise<{ path: string; sha: string; size: number; type: string }[]> {
  const res = await fetchWithRetry(
    `https://api.github.com/repos/${owner}/${name}/git/trees/${sha}?recursive=1`,
    { headers: apiHeaders(opts) },
  );
  if (!res.ok) return [];
  const j = (await res.json()) as {
    tree: { path: string; sha: string; size?: number; type: string }[];
    truncated?: boolean;
  };
  return j.tree
    .filter((t) => t.type === "blob")
    .map((t) => ({ path: t.path, sha: t.sha, size: t.size ?? 0, type: t.type }));
}

/**
 * Raw.githubusercontent first (fast for public), then contents API
 * (needed for many private-repo cases when using OAuth/installation tokens).
 */
export async function fetchFileText(
  owner: string,
  name: string,
  path: string,
  ref: string,
  opts?: GitHubFetchOptions,
): Promise<string | null> {
  const { token } = pickToken(opts);
  const url = `https://raw.githubusercontent.com/${owner}/${name}/${ref}/${encPath(path)}`;
  const res = await fetchWithRetry(url, { headers: rawHeaders(opts) });
  if (res.ok) {
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_TEXT_SIZE) return null;
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(buf);
    } catch {
      return null;
    }
  }
  if (token) {
    const fromApi = await fetchFileContentsApi(owner, name, path, ref, opts);
    if (fromApi) return fromApi;
  }
  return null;
}

export async function fetchFileBuffer(
  owner: string,
  name: string,
  path: string,
  ref: string,
  opts?: GitHubFetchOptions,
): Promise<Buffer | null> {
  const { token } = pickToken(opts);
  const url = `https://raw.githubusercontent.com/${owner}/${name}/${ref}/${encPath(path)}`;
  const res = await fetchWithRetry(url, { headers: rawHeaders(opts) });
  if (res.ok) {
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BINARY_SIZE) return null;
    return Buffer.from(buf);
  }
  if (token) {
    const t = await fetchFileContentsApi(owner, name, path, ref, opts);
    if (t) return Buffer.from(t, "utf-8");
  }
  return null;
}

/**
 * Run an array of async tasks with bounded concurrency. We keep this dep-free
 * to avoid pulling in `p-limit` for a single use site.
 */
async function pMap<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 6,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners: Promise<void>[] = [];

  const lanes = Math.min(concurrency, Math.max(1, items.length));
  for (let lane = 0; lane < lanes; lane++) {
    runners.push(
      (async () => {
        while (true) {
          const i = cursor++;
          if (i >= items.length) return;
          results[i] = await worker(items[i], i);
        }
      })(),
    );
  }
  await Promise.all(runners);
  return results;
}

/**
 * Parallel text fetch across many paths. Preserves order; null entries are
 * dropped by the consumer.
 */
export async function fetchManyText(
  owner: string,
  name: string,
  paths: string[],
  ref: string,
  opts?: GitHubFetchOptions,
  concurrency = 6,
): Promise<Array<{ path: string; content: string | null }>> {
  return pMap(
    paths,
    async (path) => ({
      path,
      content: await fetchFileText(owner, name, path, ref, opts),
    }),
    concurrency,
  );
}

/**
 * Parallel binary fetch across many paths.
 */
export async function fetchManyBuffer(
  owner: string,
  name: string,
  paths: string[],
  ref: string,
  opts?: GitHubFetchOptions,
  concurrency = 6,
): Promise<Array<{ path: string; buffer: Buffer | null }>> {
  return pMap(
    paths,
    async (path) => ({
      path,
      buffer: await fetchFileBuffer(owner, name, path, ref, opts),
    }),
    concurrency,
  );
}
