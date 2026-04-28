-- Allow authenticated users to read scan log rows where payload.userId matches their uid.
-- Logs inserted during a scan often omit repo_id until the brand_repos upsert completes;
-- this policy complements scan_logs_owner_read (repo-linked rows).

CREATE POLICY "scan_logs_select_by_payload_user"
ON public.brand_scan_logs
FOR SELECT
TO authenticated
USING ((payload->>'userId') IS NOT NULL AND (payload->>'userId') = (auth.uid())::text);
