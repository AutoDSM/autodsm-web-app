import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeRepoInput } from "@/lib/utils";
import { runRepoScan } from "@/lib/scan/run-repo-scan";
import {
  buildScanLogger,
  isScanInFlight,
} from "@/lib/scan/scan-route-helpers";

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

  const errorToFields = (e: unknown): Record<string, string | undefined> => {
    if (e instanceof Error) {
      return {
        message: e.message?.slice(0, 500),
        name: e.name?.slice(0, 120),
        stack: e.stack?.slice(0, 4000),
      };
    }
    return { message: String(e).slice(0, 500) };
  };

  const scanLog = buildScanLogger(supabase, user.id, "scan");

  const inFlight = await isScanInFlight(supabase, user.id, owner, name);
  if (inFlight.inFlight) {
    return NextResponse.json(
      {
        error: "A scan for this repository is already in progress.",
        errorCode: "scan_in_flight",
        scanStatus: inFlight.status,
        startedAt: inFlight.startedAt,
      },
      { status: 409 },
    );
  }

  const markScanError = async (message: string) => {
    await supabase.from("user_onboarding").upsert(
      { user_id: user.id, last_scan_error: message.slice(0, 500) },
      { onConflict: "user_id" }
    );
    await supabase
      .from("brand_repos")
      .update({ scan_status: "failed" })
      .eq("user_id", user.id)
      .eq("owner", owner)
      .eq("name", name);
  };

  await supabase.from("brand_repos").upsert(
    {
      user_id: user.id,
      provider: "github",
      owner,
      name,
      is_public: true,
      scan_status: "scanning",
    },
    { onConflict: "user_id,owner,name" },
  );

  await supabase.from("user_onboarding").upsert(
    {
      user_id: user.id,
      last_scan_started_at: new Date().toISOString(),
      last_scan_error: null,
      current_step: "scanning",
    },
    { onConflict: "user_id" }
  );

  let result: Awaited<ReturnType<typeof runRepoScan>>;
  try {
    result = await runRepoScan(supabase, user, session, {
      owner,
      name,
      projectName,
      scanLog,
      markScanError,
    });
  } catch (e) {
    const fields = errorToFields(e);
    scanLog("fatal", { owner, name, ...fields });
    await markScanError(
      "Scan failed unexpectedly. Open the technical details for more info, then try again."
    );
    return NextResponse.json(
      { error: "Scan failed unexpectedly. Please try again.", errorCode: "internal_error" },
      { status: 500 }
    );
  }

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
