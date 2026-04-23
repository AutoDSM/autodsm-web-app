import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandAsset, BrandProfile } from "@/lib/brand/types";
import type { AssetFile } from "@/lib/extract";

const RASTER = new Set(["png", "jpg", "jpeg", "webp", "ico", "gif"]);

function contentTypeFor(asset: BrandAsset): string {
  switch (asset.type) {
    case "png":
      return "image/png";
    case "jpg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

/**
 * When `BRAND_ASSETS_BUCKET` is set and the bucket is public, uploads each
 * raster `AssetFile` to Storage and sets `storageUrl` on the matching
 * `BrandProfile.assets` entry. SVGs stay inline from `content`.
 */
export async function withUploadedAssetUrls(
  supabase: SupabaseClient,
  userId: string,
  owner: string,
  repo: string,
  profile: BrandProfile,
  assetFiles: AssetFile[]
): Promise<BrandProfile> {
  const bucket = process.env.BRAND_ASSETS_BUCKET?.trim();
  if (!bucket || assetFiles.length === 0 || profile.assets.length === 0) {
    return profile;
  }

  const nextAssets: BrandAsset[] = [...profile.assets];

  for (let i = 0; i < nextAssets.length && i < assetFiles.length; i++) {
    const a = nextAssets[i];
    const f = assetFiles[i];
    if (a.path !== f.path) continue;
    if (!RASTER.has(a.type)) continue;

    const key = `brand-assets/${userId}/${owner}/${repo}/${a.path.replace(/[^a-zA-Z0-9._-]+/g, "_")}`;
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(key, f.buffer, {
        upsert: true,
        contentType: contentTypeFor(a),
        cacheControl: "31536000",
      });

    if (upErr) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[scan] asset upload skipped", upErr.message);
      }
      continue;
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key);
    if (pub?.publicUrl) {
      nextAssets[i] = { ...a, storageUrl: pub.publicUrl };
    }
  }

  return { ...profile, assets: nextAssets };
}
