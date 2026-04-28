import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSvg } from "@/lib/brand/sanitize-svg";
import type { BrandAsset, BrandProfile } from "@/lib/brand/types";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/svg+xml",
  "image/png",
  "image/webp",
  "image/jpeg",
  "image/jpg",
]);

function extForMime(mime: string): string {
  if (mime === "image/svg+xml") return "svg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  return "bin";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const bucket = process.env.BRAND_ASSETS_BUCKET?.trim();
  if (!bucket) {
    return NextResponse.json(
      {
        error: "Brand asset storage is not configured.",
        assetsStorageWarning: "bucket-missing" as const,
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!ALLOWED.has(mime)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use SVG, PNG, WebP, or JPEG." },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 2 MB)." }, { status: 400 });
  }

  let body: Buffer = buf;
  let contentType = mime;

  if (mime === "image/svg+xml") {
    const safe = sanitizeSvg(buf);
    if (!safe) {
      return NextResponse.json({ error: "SVG failed safety checks." }, { status: 400 });
    }
    body = safe;
    contentType = "image/svg+xml";
  }

  const ext = extForMime(mime);
  const key = `${user.id}/uploads/logo-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(key, body, {
    upsert: false,
    contentType,
    cacheControl: "31536000",
  });

  if (upErr) {
    return NextResponse.json(
      { error: upErr.message || "Upload failed", assetsStorageWarning: "upload-failed" as const },
      { status: 500 },
    );
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key);
  const storageUrl = pub.publicUrl;

  const { data: repoRow, error: repoErr } = await supabase
    .from("brand_repos")
    .select("id,brand_profile")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (repoErr || !repoRow?.brand_profile) {
    return NextResponse.json({ error: "No brand profile row found." }, { status: 400 });
  }

  const profile = structuredClone(repoRow.brand_profile) as BrandProfile;

  const assetType: BrandAsset["type"] =
    ext === "svg" ? "svg" : ext === "png" ? "png" : ext === "webp" ? "webp" : "jpg";

  const uploaded: BrandAsset = {
    name: "logo (uploaded)",
    path: "upload://logo",
    type: assetType,
    category: "logo",
    fileSize: body.length,
    fileSizeFormatted: formatBytes(body.length),
    storageUrl,
    provenance: "user",
  };

  const restAssets = profile.assets.filter((a) => a.path !== "upload://logo");
  profile.assets = [...restAssets, uploaded];
  profile.meta = {
    ...profile.meta,
    primaryLogoPath: "upload://logo",
  };

  const { error: saveErr } = await supabase
    .from("brand_repos")
    .update({
      brand_profile: profile,
      primary_logo_path: "upload://logo",
    })
    .eq("id", repoRow.id);

  if (saveErr) {
    return NextResponse.json({ error: saveErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    asset: uploaded,
    primaryLogoPath: "upload://logo",
    brand_profile: profile,
  });
}
