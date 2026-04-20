import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Lists repositories the signed-in user can access (GitHub OAuth token).
 * Requires GitHub sign-in with scopes that include listing repos (see /auth/oauth).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    return NextResponse.json({
      repos: [] as { full_name: string; private: boolean }[],
      needsGitHubReauth: true,
      message:
        "Sign out and sign in with GitHub again to load your repository list (updated OAuth permissions). You can still paste any public owner/repo below.",
    });
  }

  const res = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${session.provider_token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 0 },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      {
        repos: [] as { full_name: string; private: boolean }[],
        error: `GitHub returned ${res.status}`,
        detail: text.slice(0, 300),
      },
      { status: 200 },
    );
  }

  const data = (await res.json()) as Array<{ full_name: string; private: boolean }>;
  const repos = (Array.isArray(data) ? data : []).map((r) => ({
    full_name: r.full_name,
    private: Boolean(r.private),
  }));

  return NextResponse.json({ repos });
}
