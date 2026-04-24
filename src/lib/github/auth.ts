import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Result of resolving the best available GitHub credential for a given
 * (owner, repo) pair. Callers prefer App installation tokens (highest rate
 * limit, repo-scoped), fall back to the user's Supabase OAuth `provider_token`
 * (private-repo capable), then a server-wide PAT (`GITHUB_API_TOKEN`), and
 * finally anonymous (subject to the strict 60/hr public limit).
 */
export type GitHubAuthSource = "app" | "oauth" | "pat" | "anon";

export interface ResolvedGitHubAuth {
  token: string | null;
  source: GitHubAuthSource;
  /** Numeric installation id when source === "app". */
  installationId?: number;
}

interface CachedInstallationToken {
  token: string;
  installationId: number;
  /** ms epoch when the token expires. */
  expiresAt: number;
}

/**
 * Map keyed by `${owner}/${repo}` for installation tokens. GitHub installation
 * tokens are valid for 60 minutes; we cache for ~50 to leave a safety margin.
 */
const installationTokenCache = new Map<string, CachedInstallationToken>();
const CACHE_SAFETY_MS = 5 * 60 * 1000; // refresh 5 min early

function readPrivateKey(raw: string | undefined): string | null {
  if (!raw) return null;
  // Vercel's env vars come single-line; allow `\n` escape sequences.
  return raw.includes("BEGIN") ? raw.replace(/\\n/g, "\n") : null;
}

async function mintAppJwt(): Promise<string | null> {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = readPrivateKey(process.env.GITHUB_APP_PRIVATE_KEY);
  if (!appId || !privateKey) return null;

  try {
    const { App } = await import("@octokit/app");
    const app = new App({ appId, privateKey });
    // octokit-app exposes a JWT helper indirectly; the simplest path is to use
    // the underlying Octokit instance's `auth({ type: "app" })` call.
    // See https://github.com/octokit/app.js
    const jwt = (await app.octokit.auth({ type: "app" })) as { token: string };
    return jwt.token;
  } catch {
    return null;
  }
}

/**
 * Find the installation id for `${owner}/${repo}`. Requires an App JWT.
 * Returns `null` if the App is not installed on the repo.
 */
async function findInstallationId(
  owner: string,
  repo: string,
  jwt: string,
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/installation`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: `Bearer ${jwt}`,
          "User-Agent": "autoDSM/0.1",
        },
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { id?: number };
    return typeof j.id === "number" ? j.id : null;
  } catch {
    return null;
  }
}

/**
 * Exchange an App JWT + installation id for a short-lived installation token.
 */
async function mintInstallationToken(
  installationId: number,
  jwt: string,
): Promise<{ token: string; expiresAt: number } | null> {
  try {
    const res = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          Authorization: `Bearer ${jwt}`,
          "User-Agent": "autoDSM/0.1",
        },
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { token?: string; expires_at?: string };
    if (!j.token) return null;
    const expiresAt = j.expires_at
      ? new Date(j.expires_at).getTime() - CACHE_SAFETY_MS
      : Date.now() + 50 * 60 * 1000;
    return { token: j.token, expiresAt };
  } catch {
    return null;
  }
}

async function tryAppAuth(
  owner: string,
  repo: string,
): Promise<ResolvedGitHubAuth | null> {
  const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const cached = installationTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      token: cached.token,
      source: "app",
      installationId: cached.installationId,
    };
  }

  const jwt = await mintAppJwt();
  if (!jwt) return null;

  const installationId = await findInstallationId(owner, repo, jwt);
  if (installationId == null) return null;

  const minted = await mintInstallationToken(installationId, jwt);
  if (!minted) return null;

  installationTokenCache.set(cacheKey, {
    token: minted.token,
    installationId,
    expiresAt: minted.expiresAt,
  });

  return { token: minted.token, source: "app", installationId };
}

/**
 * Resolve the best GitHub credential available for `${owner}/${repo}`.
 *
 * Order of preference:
 *   1. GitHub App installation token (if configured + installed on the repo)
 *   2. The user's Supabase `session.provider_token` (private-repo capable)
 *   3. The server's `GITHUB_API_TOKEN` PAT (public repos only, higher limit)
 *   4. Anonymous (60 req/hr per IP)
 */
export async function resolveGitHubAuth(
  _supabase: SupabaseClient | null,
  owner: string,
  repo: string,
  userAccessToken?: string | null,
): Promise<ResolvedGitHubAuth> {
  const fromApp = await tryAppAuth(owner, repo);
  if (fromApp) return fromApp;

  if (userAccessToken) {
    return { token: userAccessToken, source: "oauth" };
  }

  const pat = process.env.GITHUB_API_TOKEN;
  if (pat) {
    return { token: pat, source: "pat" };
  }

  return { token: null, source: "anon" };
}

/** For tests: clears the in-memory installation token cache. */
export function __resetGitHubAuthCacheForTests(): void {
  installationTokenCache.clear();
}
