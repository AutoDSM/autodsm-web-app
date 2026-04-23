import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    owner: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
  })
  .strict();

/**
 * POST /api/repos/connect
 * Sets the user's connected repo by inserting a new `brand_repos` row.
 * We treat the newest row (by created_at) as the active repo (see `loadMyBrand`).
 */
export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const owner = parsed.data.owner.trim();
  const name = parsed.data.name.trim();

  const { error } = await supabase.from("brand_repos").insert({
    user_id: user.id,
    provider: "github",
    owner,
    name,
    is_public: true,
    scan_status: "pending",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, owner, name });
}

