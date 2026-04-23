import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    confirm: z.string().min(1).max(200),
  })
  .strict();

/**
 * POST /api/account/delete
 * Hard-deletes the authenticated user's Supabase Auth account (and cascades DB rows).
 *
 * Requires a typed confirmation string ("DELETE") to reduce accidental clicks.
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

  if (parsed.data.confirm.trim().toUpperCase() !== "DELETE") {
    return NextResponse.json({ error: "Confirmation text did not match" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

