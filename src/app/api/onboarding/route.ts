import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingStepKey } from "@/lib/onboarding/types";
import { ROLE_OPTIONS, TEAM_SIZE_OPTIONS } from "@/lib/onboarding/types";
import { normalizeRepoInput } from "@/lib/utils";

export const dynamic = "force-dynamic";

const roleValues: Set<string> = new Set(ROLE_OPTIONS.map((r) => r.value));
const teamValues: Set<string> = new Set(TEAM_SIZE_OPTIONS.map((t) => t.value));
const stepValues = new Set<OnboardingStepKey>([
  "welcome",
  "role",
  "team",
  "company",
  "connect",
  "scanning",
  "review",
]);

const patchBody = z
  .object({
    displayName: z.string().min(0).max(200).optional(),
    website: z.string().min(0).max(2048).optional(),
    companyName: z.string().min(0).max(200).optional(),
    companyWebsite: z.string().min(0).max(2048).optional(),
    role: z
      .string()
      .refine((v) => v === "" || roleValues.has(v), "Invalid role")
      .optional(),
    teamSize: z
      .string()
      .refine((v) => v === "" || teamValues.has(v), "Invalid team size")
      .optional(),
    repo: z.string().min(0).max(500).optional(),
    projectName: z.string().min(0).max(200).optional(),
    currentStep: z
      .string()
      .refine(
        (v) => v === "" || (v !== "" && stepValues.has(v as OnboardingStepKey)),
        "Invalid step",
      )
      .optional(),
    /** Set after company form submit — server sets profile_completed_at. */
    setProfileComplete: z.boolean().optional(),
    lastScanStarted: z.boolean().optional(),
    lastScanError: z.string().min(0).max(2000).nullable().optional(),
    clearLastScanError: z.boolean().optional(),
  })
  .strict();

type PatchBody = z.infer<typeof patchBody>;

/**
 * GET /api/onboarding — own row (RLS) or 401
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("user_onboarding")
    .select(
      "user_id, display_name, personal_website, role, team_size, company_name, company_website, intended_repo_full_name, intended_project_name, current_step, profile_completed_at, last_scan_started_at, last_scan_error, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ onboarding: null });
  }
  return NextResponse.json({ onboarding: data });
}

function bodyToRow(userId: string, body: PatchBody): Record<string, unknown> {
  const out: Record<string, unknown> = { user_id: userId };
  if (body.displayName !== undefined) {
    out.display_name = body.displayName.trim() || null;
  }
  if (body.website !== undefined) {
    out.personal_website = body.website.trim() || null;
  }
  if (body.companyName !== undefined) {
    out.company_name = body.companyName.trim() || null;
  }
  if (body.companyWebsite !== undefined) {
    out.company_website = body.companyWebsite.trim() || null;
  }
  if (body.role !== undefined) {
    out.role = body.role.trim() || null;
  }
  if (body.teamSize !== undefined) {
    out.team_size = body.teamSize.trim() || null;
  }
  if (body.repo !== undefined) {
    const s = body.repo.trim();
    if (s) {
      const n = normalizeRepoInput(s);
      if (!n) {
        throw new Error("Invalid repo");
      }
      out.intended_repo_full_name = n;
    } else {
      out.intended_repo_full_name = null;
    }
  }
  if (body.projectName !== undefined) {
    out.intended_project_name = body.projectName.trim() || null;
  }
  if (body.currentStep !== undefined) {
    out.current_step = body.currentStep.trim() || null;
  }
  if (body.setProfileComplete === true) {
    out.profile_completed_at = new Date().toISOString();
  }
  if (body.lastScanStarted === true) {
    out.last_scan_started_at = new Date().toISOString();
  }
  if (body.clearLastScanError === true) {
    out.last_scan_error = null;
  } else if (body.lastScanError !== undefined) {
    out.last_scan_error = body.lastScanError;
  }
  return out;
}

/**
 * PATCH /api/onboarding — upsert own row
 */
export async function PATCH(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  let row: Record<string, unknown>;
  try {
    row = bodyToRow(user.id, parsed.data);
  } catch {
    return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
  }
  const { error } = await supabase.from("user_onboarding").upsert(row, {
    onConflict: "user_id",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
