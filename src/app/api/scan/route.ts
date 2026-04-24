import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeRepoInput } from "@/lib/utils";
import { runRepoScan } from "@/lib/scan/run-repo-scan";

export const runtime = "nodejs";
// Inline scan can take a while for large monorepos; Fluid Compute supports
// up to 300s. Matched in vercel.json so Vercel honours this in production.
export const maxDuration = 300;

/**
 * POST /api/scan
 * Body: { repo: "owner/name" OR full GitHub URL, projectName?: string }
 */
export async function POST(req: NextRequest) {
  let body: { repo?: string; projectName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = normalizeRepoInput(body.repo ?? "");
  if (!slug) {
    return NextResponse.json(
      { error: "Invalid repo. Use 'owner/name' or a GitHub URL." },
      { status: 400 }
    );
  }
  const [owner, name] = slug.split("/");
  const projectName = (body.projectName ?? "").trim() || name;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const scanLog = (event: string, fields?: Record<string, string | undefined>) => {
    if (process.env.NODE_ENV === "development") {
      console.info("[scan]", event, fields ?? "");
    } else {
      console.info(`[scan] ${JSON.stringify({ event, ...fields })}`);
    }
    void supabase
      .from("brand_scan_logs")
      .insert({
        event,
        payload: { ...fields, scope: "scan", userId: user.id },
      })
      .then(() => undefined, () => undefined);
  };

  const markScanError = async (message: string) => {
    await supabase.from("user_onboarding").upsert(
      { user_id: user.id, last_scan_error: message.slice(0, 500) },
      { onConflict: "user_id" }
    );
  };

  await supabase.from("user_onboarding").upsert(
    {
      user_id: user.id,
      last_scan_started_at: new Date().toISOString(),
      last_scan_error: null,
      current_step: "scanning",
    },
    { onConflict: "user_id" }
  );

  const result = await runRepoScan(supabase, user, session, {
    owner,
    name,
    projectName,
    scanLog,
    markScanError,
  });

  if (result.kind === "error") {
    return NextResponse.json(result.body, { status: result.status });
  }
  if (result.kind === "unsupported") {
    return NextResponse.json(result.body, { status: 200 });
  }
  return NextResponse.json({
    status: "completed",
    owner: result.owner,
    name: result.name,
  });
}
