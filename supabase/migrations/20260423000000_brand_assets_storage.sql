-- brand_assets_storage: public Storage bucket + RLS for per-user uploads,
-- additive columns on brand_repos for cached scan outputs, helpful indexes,
-- and Realtime publication so the dashboard can react to scan_status flips.

-- ─── Storage bucket ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('brand-assets', 'brand-assets', true, 5242880)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

-- Storage policies: writes scoped to brand-assets/{auth.uid()}/...,
-- public reads for everyone.
DROP POLICY IF EXISTS "brand_assets_public_read" ON storage.objects;
CREATE POLICY "brand_assets_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "brand_assets_owner_insert" ON storage.objects;
CREATE POLICY "brand_assets_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "brand_assets_owner_update" ON storage.objects;
CREATE POLICY "brand_assets_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "brand_assets_owner_delete" ON storage.objects;
CREATE POLICY "brand_assets_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- ─── brand_repos additive columns ─────────────────────────────────────────
ALTER TABLE "public"."brand_repos"
  ADD COLUMN IF NOT EXISTS "project_root" text,
  ADD COLUMN IF NOT EXISTS "tint_hex" text,
  ADD COLUMN IF NOT EXISTS "primary_logo_path" text,
  ADD COLUMN IF NOT EXISTS "assets_storage_warning" text,
  ADD COLUMN IF NOT EXISTS "extractor_version" integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "brand_repos_user_recent_idx"
  ON "public"."brand_repos" ("user_id", "created_at" DESC);

-- ─── Realtime ──────────────────────────────────────────────────────────────
-- Add brand_repos to the supabase_realtime publication if not already present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'brand_repos'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_repos';
    END IF;
  END IF;
END
$$;

COMMENT ON COLUMN "public"."brand_repos"."project_root" IS
  'Selected project root prefix within the repo (e.g. "apps/web" for monorepos). Empty string for root-level apps.';
COMMENT ON COLUMN "public"."brand_repos"."tint_hex" IS
  'Cached primary tint chosen at scan time so dashboard SSR matches CSR.';
COMMENT ON COLUMN "public"."brand_repos"."primary_logo_path" IS
  'Repo-relative path of the picked brand logo asset.';
COMMENT ON COLUMN "public"."brand_repos"."assets_storage_warning" IS
  'Non-fatal Storage condition (e.g. "bucket-missing", "bucket-private") surfaced in the dashboard banner.';
COMMENT ON COLUMN "public"."brand_repos"."extractor_version" IS
  'Mirrors BrandProfile.meta.extractorVersion so we can index/filter rescans.';
