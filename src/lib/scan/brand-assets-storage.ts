import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeSvg } from "@/lib/brand/sanitize-svg";
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
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function safePathSegment(path: string): string {
  return path.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

type StorageWarning = NonNullable<BrandProfile["meta"]["assetsStorageWarning"]>;

async function validateBucket(
  supabase: SupabaseClient,
  bucket: string,
): Promise<{ ok: true } | { ok: false; warning: StorageWarning }> {
  try {
    const { data, error } = await supabase.storage.getBucket(bucket);
    if (error || !data) return { ok: false, warning: "bucket-missing" };
    if (!data.public) return { ok: false, warning: "bucket-private" };
    return { ok: true };
  } catch {
    return { ok: false, warning: "bucket-missing" };
  }
}

/**
 * Uploads scanned assets to Supabase Storage and writes the resulting
 * `storageUrl` back onto each `BrandProfile.assets` entry.
 *
 * Behavioural notes:
 * - Iterates `profile.assets` and looks each up in a `Map<path, AssetFile>` so
 *   one failure no longer hides every later asset.
 * - SVGs are sanitized (no <script>, no on-* attrs) and uploaded too.
 * - When the bucket is missing, private, or `BRAND_ASSETS_BUCKET` is unset, the
 *   profile is returned unchanged with a `meta.assetsStorageWarning` flag.
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
  if (!bucket) {
    return {
      ...profile,
      meta: { ...profile.meta, assetsStorageWarning: "bucket-missing" },
    };
  }
  if (assetFiles.length === 0 || profile.assets.length === 0) {
    return profile;
  }

  const validation = await validateBucket(supabase, bucket);
  if (!validation.ok) {
    return {
      ...profile,
      meta: { ...profile.meta, assetsStorageWarning: validation.warning },
    };
  }

  const fileByPath = new Map<string, AssetFile>();
  for (const f of assetFiles) fileByPath.set(f.path, f);

  const nextAssets: BrandAsset[] = new Array(profile.assets.length);
  let failedUploads = 0;

  for (let i = 0; i < profile.assets.length; i++) {
    const asset = profile.assets[i];
    nextAssets[i] = asset;
    const file = fileByPath.get(asset.path);
    if (!file) continue;

    let bodyBuffer: Buffer | null = null;
    if (asset.type === "svg") {
      bodyBuffer = sanitizeSvg(file.buffer);
      if (!bodyBuffer) continue;
    } else if (RASTER.has(asset.type)) {
      bodyBuffer = file.buffer;
    } else {
      continue;
    }

    const key = `${userId}/${owner}/${repo}/${safePathSegment(asset.path)}`;
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(key, bodyBuffer, {
        upsert: true,
        contentType: contentTypeFor(asset),
        cacheControl: "31536000",
      });

    if (upErr) {
      failedUploads += 1;
      if (process.env.NODE_ENV === "development") {
        console.warn("[scan] asset upload failed", asset.path, upErr.message);
      }
      continue;
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(key);
    if (pub?.publicUrl) {
      nextAssets[i] = { ...asset, storageUrl: pub.publicUrl };
    }
  }

  const nextMeta = { ...profile.meta };
  if (failedUploads > 0 && failedUploads === profile.assets.length) {
    nextMeta.assetsStorageWarning = "upload-failed";
  } else {
    delete nextMeta.assetsStorageWarning;
  }

  return { ...profile, assets: nextAssets, meta: nextMeta };
}
