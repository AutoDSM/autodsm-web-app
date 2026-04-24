-- scan_logs_payload: documents the structured shape of brand_scan_logs.payload
-- used by the inline /api/scan worker.
--
-- Convention (no schema change — payload is jsonb):
--   {
--     "step": "fetch_meta" | "fetch_tree" | "fetch_css" | "fetch_layouts" |
--             "fetch_assets" | "build_profile" | "upload_assets" | "save",
--     "ok": boolean,
--     "durationMs": number,
--     "counts": {
--       "cssFiles": number,
--       "layoutFiles": number,
--       "assetCandidates": number,
--       "assetsUploaded": number,
--       "assetsSkipped": number,
--       "colors": number,
--       "fonts": number
--     },
--     "ghAuthSource": "app" | "oauth" | "pat" | "anon",
--     "projectRoot": string | null,
--     "tintHex": string | null,
--     "primaryLogoPath": string | null,
--     "error": { "code": string, "message": string } | null
--   }

CREATE INDEX IF NOT EXISTS "brand_scan_logs_repo_recent_idx"
  ON "public"."brand_scan_logs" ("repo_id", "created_at" DESC);

COMMENT ON COLUMN "public"."brand_scan_logs"."payload" IS
  'Structured per-step diagnostics. See migration 20260423000100_scan_logs_payload.sql for shape.';
