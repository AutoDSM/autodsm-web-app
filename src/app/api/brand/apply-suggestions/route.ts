import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { BrandColor, BrandProfile } from "@/lib/brand/types";
import { buildSuggestions } from "@/lib/brand/token-suggestions";
import { mergeColorScale, typographyRowsFromGuide } from "@/lib/brand/finalize-profile";

export const runtime = "nodejs";

const bodySchema = z.object({
  suggestionIds: z.array(z.string()).min(1),
});

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
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: repoRow, error: repoErr } = await supabase
    .from("brand_repos")
    .select("id,owner,name,brand_profile")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (repoErr || !repoRow?.brand_profile) {
    return NextResponse.json(
      { error: repoErr?.message ?? "No brand profile found." },
      { status: 400 },
    );
  }

  const baseProfile = structuredClone(repoRow.brand_profile) as BrandProfile;
  const suggestions = buildSuggestions(baseProfile);
  const profile = structuredClone(baseProfile) as BrandProfile;
  const ids = new Set(parsed.data.suggestionIds);
  const colorsAdded: BrandColor[] = [];

  if (ids.has("colors:scale-from-primary")) {
    const s = suggestions.find((x) => x.id === "colors:scale-from-primary");
    if (s && "preview" in s) {
      colorsAdded.push(...mergeColorScale(profile, s.preview, "primary"));
    }
  }
  if (ids.has("colors:scale-from-secondary")) {
    const s = suggestions.find((x) => x.id === "colors:scale-from-secondary");
    if (s && "preview" in s) {
      colorsAdded.push(...mergeColorScale(profile, s.preview, "secondary"));
    }
  }
  profile.colors = [...profile.colors, ...colorsAdded];

  if (ids.has("typography:guide-from-base")) {
    const s = suggestions.find((x) => x.id === "typography:guide-from-base");
    if (s && "preview" in s) {
      const guide = s.preview;
      profile.typography = [...profile.typography, ...typographyRowsFromGuide(guide)];
      profile.meta = { ...profile.meta, typographyGuide: guide };
    }
  }

  const reviewedAt = new Date().toISOString();
  profile.meta = {
    ...profile.meta,
    lastReviewedAt: reviewedAt,
    tokenChoices: {
      acceptedSuggestions: [...parsed.data.suggestionIds],
      dismissed: profile.meta.tokenChoices?.dismissed ?? [],
      reviewedAt,
    },
  };

  const { error: saveErr } = await supabase
    .from("brand_repos")
    .update({
      brand_profile: profile,
      tint_hex: profile.meta?.tintHex ?? null,
      primary_logo_path: profile.meta?.primaryLogoPath ?? null,
    })
    .eq("id", repoRow.id);

  if (saveErr) {
    return NextResponse.json({ error: saveErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, brand_profile: profile });
}
