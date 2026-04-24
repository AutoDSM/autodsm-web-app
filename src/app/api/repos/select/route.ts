import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeRepoInput } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * POST /api/repos/select
 * Body: { repo: "owner/name" | full GitHub URL }
 * Persists the user's selection to `user_preferences.last_repo` so
 * `loadMyBrand()` returns this row on the next request.
 */
export async function POST(req: NextRequest) {
  let body: { repo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = normalizeRepoInput(body.repo ?? "");
  if (!slug) {
    return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [owner, name] = slug.split("/");
  // Confirm the user owns this repo before storing the preference.
  const { data: repo } = await supabase
    .from("brand_repos")
    .select("id")
    .eq("user_id", user.id)
    .eq("owner", owner)
    .eq("name", name)
    .maybeSingle();

  if (!repo) {
    return NextResponse.json({ error: "Repo not connected" }, { status: 404 });
  }

  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: user.id,
        last_repo: slug,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, repo: slug });
}
