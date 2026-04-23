import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/repos/disconnect
 * Disconnects the current repo by deleting the most recently connected `brand_repos` row.
 * (We treat the newest row as active; see `loadMyBrand`.)
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: repoRow, error: repoErr } = await supabase
    .from("brand_repos")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (repoErr) {
    return NextResponse.json({ error: repoErr.message }, { status: 500 });
  }
  if (!repoRow?.id) {
    return NextResponse.json({ ok: true, disconnected: false });
  }

  const { error } = await supabase.from("brand_repos").delete().eq("id", repoRow.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, disconnected: true });
}

