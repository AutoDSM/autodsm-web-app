# Brand scan smoke matrix

Run these manual smoke checks after any change that touches the scan pipeline
(`/api/scan`, `runRepoScan`, the extractors, asset upload, or the dashboard
loader). For each row, connect the repo from the dashboard, trigger a scan, and
verify the listed expectations.

| # | Repo | Expected scan result | Things to verify on the dashboard |
|---|------|----------------------|-----------------------------------|
| 1 | [`vercel/next.js`](https://github.com/vercel/next.js) (`packages/next`) | `success` | Monorepo project root resolved (`packages/next` or repo root). Colors and typography render. Any logo asset visible. |
| 2 | [`shadcn-ui/ui`](https://github.com/shadcn-ui/ui) (`apps/www`) | `success` | shadcn HSL tokens (`H S% L%` and `hsl(var(--…) / α)`) parsed into the Colors page. Light + dark variants present. |
| 3 | [`vercel/ai-chatbot`](https://github.com/vercel/ai-chatbot) | `success` | Tailwind v4 `@theme` tokens picked up. `meta.tintHex` populated and topbar tint matches Primary. |
| 4 | A small public Vite + TypeScript app | `success` | `BrandProfile` populated despite no Next.js conventions. Asset bucket warning absent. |
| 5 | A pure Astro/Markdown site (no React) | `unsupported` | `/onboarding/unsupported` shows the friendly reason; dashboard issue banner reflects `last_scan_error`. |
| 6 | A private repo (GitHub App installed) | `success` | `resolveGitHubAuth` uses the App installation token (no rate-limit warning). `brand_repos.private = true`. |
| 7 | Same private repo without App installed, only OAuth | `success` or `repo_inaccessible` | If `success`, falls back to `session.provider_token`. If 401, banner says "Reconnect with GitHub". |

## Asset storage smoke

After scan #1–4, in Supabase Studio confirm:

- `storage.buckets.brand-assets` is `public = true`.
- New objects exist under `brand-assets/{auth.uid()}/{owner}/{repo}/…`.
- SVG payloads do not contain `<script>` or `on*=` attributes (sanitization).
- `brand_repos.assets_storage_warning` is `null` for successful scans.

## Telemetry smoke

For any failing scan, run:

```sql
select created_at, event, payload
from public.brand_scan_logs
where repo_id = '<uuid>'
order by created_at desc
limit 20;
```

The output should include structured `event`/`payload` rows (no free-form
strings), and the dashboard banner's "Show technical details" disclosure should
mirror the latest row.

## Realtime smoke

With the dashboard open in two tabs, trigger a scan from tab A. Tab B should
refresh automatically when `brand_repos.scan_status` flips, courtesy of the
Supabase Realtime subscription wired into `BrandProvider`.
