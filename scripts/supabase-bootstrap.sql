-- supabase-bootstrap.sql — idempotent bootstrap.
--
-- Run via the Supabase SQL Editor (or `psql $DIRECT_URL -f scripts/supabase-bootstrap.sql`)
-- on a fresh project AFTER `supabase db push` has applied all migrations.
-- This is a thin convenience wrapper that re-asserts the bits we depend on at
-- runtime so an environment can be brought online quickly.

-- 1) Ensure the brand-assets bucket exists and is public.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('brand-assets', 'brand-assets', true, 5242880)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

-- 2) Re-assert brand-assets policies (mirrors the migration; safe to re-run).
DROP POLICY IF EXISTS "brand_assets_public_read" ON storage.objects;
CREATE POLICY "brand_assets_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "brand_assets_owner_insert" ON storage.objects;
CREATE POLICY "brand_assets_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "brand_assets_owner_update" ON storage.objects;
CREATE POLICY "brand_assets_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
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
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- 3) Make sure brand_repos is on the realtime publication.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'brand_repos'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_repos';
    END IF;
  END IF;
END
$$;
