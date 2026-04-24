import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withUploadedAssetUrls } from "./brand-assets-storage";
import type { BrandAsset, BrandProfile } from "@/lib/brand/types";
import type { AssetFile } from "@/lib/extract";

function makeAsset(path: string, type: BrandAsset["type"] = "png"): BrandAsset {
  return {
    name: path.split("/").pop() ?? path,
    path,
    type,
    category: "image",
    fileSize: 100,
    fileSizeFormatted: "100 B",
  };
}

function makeProfile(assets: BrandAsset[]): BrandProfile {
  return {
    repo: { owner: "o", name: "r", branch: "main", url: "" },
    scannedAt: new Date().toISOString(),
    scannedFromSha: "sha",
    colors: [],
    typography: [],
    fonts: [],
    spacing: [],
    shadows: [],
    radii: [],
    borders: [],
    animations: [],
    breakpoints: [],
    opacity: [],
    zIndex: [],
    gradients: [],
    assets,
    meta: {
      filesScanned: 0,
      cssSource: "",
      tailwindConfigPath: null,
      shadcnConfigPath: null,
      tailwindVersion: null,
      extractorVersion: 7,
    },
  };
}

function makeFile(path: string, body = "data"): AssetFile {
  return { path, buffer: Buffer.from(body) };
}

function makeMockSupabase(opts?: {
  uploadError?: (key: string) => string | null;
  publicUrlBase?: string;
  bucketPublic?: boolean;
  bucketMissing?: boolean;
}) {
  const uploadCalls: Array<{ key: string; bucket: string }> = [];
  const supabase = {
    storage: {
      getBucket: vi.fn(async () => {
        if (opts?.bucketMissing) return { data: null, error: { message: "missing" } };
        return {
          data: { public: opts?.bucketPublic !== false },
          error: null,
        };
      }),
      from: (bucket: string) => ({
        upload: vi.fn(async (key: string) => {
          uploadCalls.push({ key, bucket });
          const err = opts?.uploadError?.(key);
          return err ? { error: { message: err } } : { error: null };
        }),
        getPublicUrl: (key: string) => ({
          data: { publicUrl: `${opts?.publicUrlBase ?? "https://cdn.example/"}${key}` },
        }),
      }),
    },
  };
  return { supabase, uploadCalls };
}

const ORIGINAL_BUCKET = process.env.BRAND_ASSETS_BUCKET;

beforeEach(() => {
  process.env.BRAND_ASSETS_BUCKET = "brand-assets";
});

afterEach(() => {
  if (ORIGINAL_BUCKET == null) delete process.env.BRAND_ASSETS_BUCKET;
  else process.env.BRAND_ASSETS_BUCKET = ORIGINAL_BUCKET;
  vi.restoreAllMocks();
});

describe("withUploadedAssetUrls path-keyed map", () => {
  it("uploads each asset by its path even when ordering differs", async () => {
    const profile = makeProfile([
      makeAsset("public/logo.png"),
      makeAsset("public/icon.png"),
    ]);
    const files = [
      makeFile("public/icon.png", "ICON"),
      makeFile("public/logo.png", "LOGO"),
    ];
    const { supabase, uploadCalls } = makeMockSupabase();

    const out = await withUploadedAssetUrls(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "user-1",
      "owner",
      "repo",
      profile,
      files,
    );

    expect(uploadCalls).toHaveLength(2);
    expect(out.assets[0].storageUrl).toContain("public_logo.png");
    expect(out.assets[1].storageUrl).toContain("public_icon.png");
    expect(out.meta.assetsStorageWarning).toBeUndefined();
  });

  it("does not silently skip later assets when one fails", async () => {
    const profile = makeProfile([
      makeAsset("public/a.png"),
      makeAsset("public/b.png"),
      makeAsset("public/c.png"),
    ]);
    const files = [
      makeFile("public/a.png"),
      makeFile("public/b.png"),
      makeFile("public/c.png"),
    ];
    const { supabase } = makeMockSupabase({
      uploadError: (k) => (k.includes("public_b") ? "boom" : null),
    });

    const out = await withUploadedAssetUrls(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "user-1",
      "owner",
      "repo",
      profile,
      files,
    );

    expect(out.assets[0].storageUrl).toBeTruthy();
    expect(out.assets[1].storageUrl).toBeUndefined();
    expect(out.assets[2].storageUrl).toBeTruthy();
  });

  it("flags bucket-missing when getBucket fails", async () => {
    const profile = makeProfile([makeAsset("public/logo.png")]);
    const files = [makeFile("public/logo.png")];
    const { supabase } = makeMockSupabase({ bucketMissing: true });

    const out = await withUploadedAssetUrls(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "user-1",
      "owner",
      "repo",
      profile,
      files,
    );

    expect(out.meta.assetsStorageWarning).toBe("bucket-missing");
    expect(out.assets[0].storageUrl).toBeUndefined();
  });

  it("flags bucket-private when bucket is non-public", async () => {
    const profile = makeProfile([makeAsset("public/logo.png")]);
    const files = [makeFile("public/logo.png")];
    const { supabase } = makeMockSupabase({ bucketPublic: false });

    const out = await withUploadedAssetUrls(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
      "user-1",
      "owner",
      "repo",
      profile,
      files,
    );

    expect(out.meta.assetsStorageWarning).toBe("bucket-private");
  });
});
